import { Router } from "express";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { AgentOrchestrator } from "../../src/services/agent/agentOrchestrator.js";
import { sourceRegistry } from "../../src/services/adapters/sourceRegistry.js";
import { ProposalGroundingEngine } from "../../src/services/agent/proposalGrounding.js";
import { AiQuotaService } from "../services/aiQuotaService.js";

export function createAgentRouter(prisma: PrismaClient) {
  const router = Router();
  const orchestrator = new AgentOrchestrator(prisma);

  const getActiveUser = async (req: any) => {
    if (req.user) return req.user;
    const demo = await prisma.user.findFirst({ where: { email: "demo@gigflow.local" } });
    if (demo) return demo;
    return await prisma.user.findFirst();
  };

  // 0. Get AI Quota and Credit Status
  router.get("/user/ai-quota", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    try {
      const quota = await AiQuotaService.checkQuota(prisma, user.id);
      res.json(quota);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check quota" });
    }
  });

  // 1. Create Agent Run
  router.post("/agent-runs", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const instruction = req.body.instruction || req.body.command;
    const apiKey = req.body.apiKey;
    if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
      return res.status(400).json({ error: "Instruction is required" });
    }

    try {
      // Check quota before starting
      const quotaCheck = await AiQuotaService.checkQuota(prisma, user.id);
      if (!quotaCheck.allowed) {
        return res.status(403).json({
          error: quotaCheck.message || "Daily free AI limit reached. Please upgrade or add credits to continue.",
          quota: quotaCheck,
        });
      }

      const run = await prisma.agentRun.create({
        data: {
          userId: user.id,
          instruction: instruction.trim(),
          status: "DRAFT",
        },
      });

      // Deduct quota
      await AiQuotaService.consumeQuota(prisma, user.id).catch((e) => {
        console.warn("[QUOTA] Warning consuming quota:", e.message);
      });

      // Start asynchronous execution
      orchestrator.executeRun(run.id, apiKey).catch((err) => {
        console.error(`[AGENT_ROUTER] Error executing run ${run.id}:`, err);
      });

      res.status(201).json(run);
    } catch (error: any) {
      console.error("[AGENT_ROUTER] Failed to create run:", error);
      res.status(500).json({ error: error.message || "Failed to create agent run" });
    }
  });

  // 2. List Agent Runs
  router.get("/agent-runs", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const runs = await prisma.agentRun.findMany({
        where: { userId: user.id },
        include: {
          tasks: {
            include: { opportunity: true },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      });

      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list runs" });
    }
  });

  // 3. Get Single Agent Run with Details
  router.get("/agent-runs/:id", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const run = await prisma.agentRun.findFirst({
        where: {
          id: req.params.id,
          userId: user.id,
        },
        include: {
          tasks: {
            include: { opportunity: true },
            orderBy: { score: "desc" },
          },
        },
      });

      if (!run) return res.status(404).json({ error: "Agent run not found" });
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get run details" });
    }
  });

  // 4. Update Agent Task (Edit proposal, Approve, Reject, Regenerate)
  router.patch("/agent-tasks/:id", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { proposal, proposalStatus, action, apiKey } = req.body;

    try {
      const task = await prisma.agentTask.findUnique({
        where: { id: req.params.id },
        include: { opportunity: true, agentRun: true },
      });

      if (!task || task.agentRun.userId !== user.id) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (action === "REGENERATE") {
        const userContext = await orchestrator.buildUserContext(user.id);
        const resolvedKey = apiKey || process.env.GEMINI_API_KEY;
        if (!resolvedKey) {
          return res.status(400).json({ error: "Gemini API key is required for regeneration" });
        }

        const rawOpp = {
          platform: task.opportunity.platform,
          canonicalUrl: task.opportunity.canonicalUrl || "",
          title: task.opportunity.title,
          description: task.opportunity.description,
          budgetMin: task.opportunity.budgetMin || undefined,
          budgetMax: task.opportunity.budgetMax || undefined,
          currency: task.opportunity.currency || "USD",
          requiredSkills: task.opportunity.requiredSkills ? task.opportunity.requiredSkills.split(", ") : [],
        };

        const result = await ProposalGroundingEngine.generateGroundedProposal(rawOpp, userContext, resolvedKey);

        const updated = await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            proposal: result.proposal,
            proposalVersion: { increment: 1 },
            proposalStatus: "READY",
          },
          include: { opportunity: true },
        });

        return res.json(updated);
      }

      const updated = await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          proposal: typeof proposal === "string" ? proposal : undefined,
          proposalStatus: proposalStatus || (proposal ? "USER_EDITED" : undefined),
          userApprovedAt: proposalStatus === "APPROVED" ? new Date() : undefined,
        },
        include: { opportunity: true },
      });

      res.json(updated);
    } catch (error: any) {
      console.error("[AGENT_ROUTER] Task update error:", error);
      res.status(500).json({ error: error.message || "Failed to update task" });
    }
  });

  // 5. Approve Batch of Tasks
  router.post("/agent-runs/:id/approve", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds array is required" });
    }

    try {
      const result = await orchestrator.approveTasks(req.params.id, taskIds);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to approve tasks" });
    }
  });

  // 6. Execute Approved Applications
  router.post("/agent-runs/:id/execute", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const result = await orchestrator.executeApplications(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to execute applications" });
    }
  });

  // 7. Sources API (List, Health, Toggle)
  router.get("/sources", async (req, res) => {
    try {
      const sources = await prisma.opportunitySource.findMany();
      const healthMap = await sourceRegistry.checkAllHealth();

      const merged = sources.map((s) => ({
        ...s,
        health: healthMap[s.key] || { status: "HEALTHY", lastChecked: new Date() },
      }));

      res.json(merged);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list sources" });
    }
  });

  router.post("/sources/:key/test", async (req, res) => {
    const { key } = req.params;
    const adapter = sourceRegistry.getAdapter(key);
    if (!adapter) {
      return res.status(404).json({ error: `Adapter for ${key} not found` });
    }

    try {
      const health = adapter.healthCheck
        ? await adapter.healthCheck()
        : { status: "HEALTHY", lastChecked: new Date() };

      await prisma.opportunitySource.updateMany({
        where: { key },
        data: {
          lastRunAt: new Date(),
          lastStatus: health.status,
        },
      });

      res.json(health);
    } catch (error: any) {
      res.status(500).json({ status: "DOWN", error: error.message });
    }
  });

  router.post("/sources/:key/toggle", async (req, res) => {
    const { key } = req.params;
    const { enabled } = req.body;

    try {
      const updated = await prisma.opportunitySource.update({
        where: { key },
        data: { enabled: Boolean(enabled) },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle source" });
    }
  });

  // 8. Documents API (Knowledge Grounding)
  router.get("/documents", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const docs = await prisma.userDocument.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  router.post("/documents", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { name, type } = req.body;
    const extractedText = req.body.extractedText || req.body.content;
    if (!name || !extractedText) {
      return res.status(400).json({ error: "Name and content are required" });
    }

    try {
      const doc = await prisma.userDocument.create({
        data: {
          userId: user.id,
          name,
          type: type || "PROPOSAL_GUIDE",
          extractedText,
          status: "READY",
        },
      });
      res.status(201).json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  router.get("/documents/:id", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const doc = await prisma.userDocument.findFirst({
        where: { id: req.params.id, userId: user.id },
      });
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  router.put("/documents/:id", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { name, extractedText, content } = req.body;
    const newContent = extractedText !== undefined ? extractedText : content;

    try {
      const doc = await prisma.userDocument.findFirst({
        where: { id: req.params.id, userId: user.id },
      });
      if (!doc) return res.status(404).json({ error: "Document not found" });

      const updated = await prisma.userDocument.update({
        where: { id: doc.id },
        data: {
          name: name ? String(name).trim() : undefined,
          extractedText: newContent !== undefined ? String(newContent) : undefined,
        },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  router.delete("/documents/:id", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      await prisma.userDocument.deleteMany({
        where: { id: req.params.id, userId: user.id },
      });
      res.json({ message: "Document deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // 9. Opportunities API
  router.get("/opportunities", async (req, res) => {
    try {
      const { search, platform, limit = 50 } = req.query;
      const where: any = {};

      if (platform && platform !== "ALL") {
        where.platform = platform as string;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { description: { contains: search as string } },
          { requiredSkills: { contains: search as string } },
        ];
      }

      const opportunities = await prisma.opportunity.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        take: parseInt(String(limit), 10) || 50,
      });

      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  // 10. Applications API
  router.get("/applications", async (req, res) => {
    const user = await getActiveUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    try {
      const apps = await prisma.application.findMany({
        where: { userId: user.id },
        include: { opportunity: true },
        orderBy: { submittedAt: "desc" },
      });
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  return router;
}
