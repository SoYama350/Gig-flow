import { PrismaClient } from "../../generated/prisma/client.js";
import { parseAgentInstruction, ParsedAgentPlan } from "./commandParser.js";
import { sourceRegistry } from "../adapters/sourceRegistry.js";
import { CandidateRanker, UserContext, CandidateEvaluation } from "./candidateRanker.js";
import { ProposalGroundingEngine } from "./proposalGrounding.js";

export class AgentOrchestrator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Builds user context from profile, skills, and uploaded documents.
   */
  async buildUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        documents: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return {
      name: user.name || user.email.split("@")[0],
      bio: user.bio || "",
      skills: user.skills.map((s) => s.name),
      documents: user.documents
        .filter((d) => d.status === "READY" && d.extractedText)
        .map((d) => ({
          name: d.name,
          type: d.type,
          text: d.extractedText || "",
        })),
    };
  }

  /**
   * Executes the full pipeline for an AgentRun.
   */
  async executeRun(runId: string, apiKey?: string): Promise<any> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      include: { user: true },
    });

    if (!run) throw new Error(`AgentRun not found: ${runId}`);

    const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!resolvedApiKey || resolvedApiKey === "YOUR_GEMINI_API_KEY_HERE") {
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "FAILED" },
      });
      throw new Error("Gemini API key is required. Please add it in Settings.");
    }

    try {
      // 1. PLANNING PHASE
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "PLANNING" },
      });

      const userContext = await this.buildUserContext(run.userId);
      const plan: ParsedAgentPlan = run.planJson
        ? JSON.parse(run.planJson)
        : parseAgentInstruction(run.instruction, userContext.skills);

      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          planJson: JSON.stringify(plan),
          targetCount: plan.targetCount,
        },
      });

      // 2. COLLECTING PHASE
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "COLLECTING" },
      });

      const collectionResult = await sourceRegistry.collectFromSources(plan.sources, {
        skills: plan.skills,
        remoteOnly: plan.remoteOnly,
        limit: Math.max(plan.targetCount * 3, 20),
        minBudget: plan.minBudget,
      });

      // 3. FILTERING PHASE
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "FILTERING" },
      });

      const preFiltered = CandidateRanker.preFilterAndScore(
        collectionResult.opportunities,
        userContext,
        { minBudget: plan.minBudget, remoteOnly: plan.remoteOnly }
      );

      // 4. RANKING PHASE
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "RANKING" },
      });

      const candidateList = preFiltered.map((p) => p.opp);
      const evaluatedCandidates = await CandidateRanker.evaluateCandidates(
        candidateList,
        userContext,
        resolvedApiKey,
        plan.targetCount
      );

      const topSelected = evaluatedCandidates.slice(0, plan.targetCount);

      // 5. GENERATING PROPOSALS PHASE
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { status: "GENERATING_PROPOSALS" },
      });

      for (const item of topSelected) {
        // Upsert opportunity into database
        const oppFingerprint = item.opportunity.fingerprint || `${item.opportunity.platform.toLowerCase()}:${item.opportunity.canonicalUrl}`;
        const dbOpp = await this.prisma.opportunity.upsert({
          where: { fingerprint: oppFingerprint },
          update: {
            title: item.opportunity.title,
            description: item.opportunity.description,
            budgetMin: item.opportunity.budgetMin,
            budgetMax: item.opportunity.budgetMax,
            currency: item.opportunity.currency,
            requiredSkills: (item.opportunity.requiredSkills || []).join(", "),
            location: item.opportunity.location,
            isRemote: item.opportunity.remote,
            canonicalUrl: item.opportunity.canonicalUrl,
          },
          create: {
            platform: item.opportunity.platform,
            title: item.opportunity.title,
            description: item.opportunity.description,
            budgetMin: item.opportunity.budgetMin,
            budgetMax: item.opportunity.budgetMax,
            currency: item.opportunity.currency,
            requiredSkills: (item.opportunity.requiredSkills || []).join(", "),
            location: item.opportunity.location,
            isRemote: item.opportunity.remote,
            canonicalUrl: item.opportunity.canonicalUrl,
            fingerprint: oppFingerprint,
            sourceMetadata: JSON.stringify(item.opportunity.sourceMetadata || {}),
          },
        });

        // Generate grounded proposal
        let proposalText = "";
        let groundingMetadata: any = {};
        try {
          const groundedResult = await ProposalGroundingEngine.generateGroundedProposal(
            item.opportunity,
            userContext,
            resolvedApiKey,
            { language: plan.language }
          );
          proposalText = groundedResult.proposal;
          groundingMetadata = groundedResult.groundedIn;
        } catch (proposalErr) {
          console.warn("[ORCHESTRATOR] Proposal generation error for opportunity:", dbOpp.id, proposalErr);
          proposalText = "Proposal generation queued. Click Regenerate to draft.";
        }

        const analysis = {
          fit: item.fit,
          reasons: item.reasons,
          risks: item.risks,
          matchedSkills: item.matchedSkills,
          missingSkills: item.missingSkills,
          grounding: groundingMetadata,
        };

        // Create or update AgentTask
        await this.prisma.agentTask.upsert({
          where: {
            agentRunId_opportunityId: {
              agentRunId: run.id,
              opportunityId: dbOpp.id,
            },
          },
          update: {
            score: item.score,
            recommendation: item.recommendation,
            analysisJson: JSON.stringify(analysis),
            proposal: proposalText,
            proposalStatus: "READY",
          },
          create: {
            agentRunId: run.id,
            opportunityId: dbOpp.id,
            score: item.score,
            recommendation: item.recommendation,
            analysisJson: JSON.stringify(analysis),
            proposal: proposalText,
            proposalStatus: "READY",
          },
        });
      }

      // 6. ENTER REVIEW REQUIRED PHASE (Human in the loop)
      const updatedRun = await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "REVIEW_REQUIRED",
          completedAt: new Date(),
        },
        include: {
          tasks: {
            include: { opportunity: true },
            orderBy: { score: "desc" },
          },
        },
      });

      return updatedRun;
    } catch (error: any) {
      console.error("[ORCHESTRATOR] Run execution failed:", error);
      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Approves selected tasks and transitions to APPROVED / APPLICATION state.
   */
  async approveTasks(runId: string, taskIds: string[]): Promise<any> {
    const tasks = await this.prisma.agentTask.findMany({
      where: {
        agentRunId: runId,
        id: { in: taskIds },
      },
      include: { opportunity: true, agentRun: true },
    });

    for (const task of tasks) {
      await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          proposalStatus: "APPROVED",
          userApprovedAt: new Date(),
        },
      });

      // Create Application record
      await this.prisma.application.upsert({
        where: {
          userId_opportunityId: {
            userId: task.agentRun.userId,
            opportunityId: task.opportunityId,
          },
        },
        update: {
          proposal: task.proposal || "",
          status: "APPROVED",
          externalUrl: task.opportunity.canonicalUrl,
        },
        create: {
          userId: task.agentRun.userId,
          opportunityId: task.opportunityId,
          proposal: task.proposal || "",
          status: "APPROVED",
          externalUrl: task.opportunity.canonicalUrl,
        },
      });
    }

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status: "APPROVED" },
    });

    return { approvedCount: tasks.length };
  }

  /**
   * Executes approved applications (submitting or marking action required).
   */
  async executeApplications(runId: string): Promise<any> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        tasks: {
          where: { proposalStatus: "APPROVED" },
          include: { opportunity: true },
        },
      },
    });

    if (!run) throw new Error("Run not found");

    const executed: any[] = [];

    for (const task of run.tasks) {
      // Mark as ACTION_REQUIRED with deep link for human confirmation on platform
      await this.prisma.application.updateMany({
        where: {
          userId: run.userId,
          opportunityId: task.opportunityId,
        },
        data: {
          status: "ACTION_REQUIRED",
          submittedAt: new Date(),
        },
      });

      await this.prisma.agentTask.update({
        where: { id: task.id },
        data: {
          proposalStatus: "SUBMITTED",
          submittedAt: new Date(),
          outcome: "Ready for platform submission via direct link",
        },
      });

      executed.push({
        taskId: task.id,
        opportunityId: task.opportunityId,
        title: task.opportunity.title,
        url: task.opportunity.canonicalUrl,
        status: "ACTION_REQUIRED",
      });
    }

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status: "COMPLETED" },
    });

    return { executed };
  }
}
