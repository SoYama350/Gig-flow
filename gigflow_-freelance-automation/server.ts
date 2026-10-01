import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "./src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { MostaqlScraper, KhamsatScraper } from "./src/services/scraper.ts";
import { generateProposal } from "./src/services/ai.ts";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createApiRouter } from "./server/routes/index.js";
import { authenticate } from "./server/middleware/authenticate.js";
import { csrfProtection } from "./server/middleware/csrfProtection.js";
import { TokenService } from "./server/services/tokenService.js";

dotenv.config({ path: ".env.local" });

const requiredEnv = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.GIGFLOW_DATABASE_URL ?? `file:${path.resolve("dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  
  // Disable CSRF for development if needed by setting BYPASS_CSRF=true
  app.use(csrfProtection);

  const tokenService = new TokenService(prisma);
  app.use(authenticate(tokenService, prisma));

  // Mount new auth API router
  app.use('/api', createApiRouter(prisma));

  // ── API Routes ──────────────────────────────────────────

  const serializeUserGig = (userGig: any) => {
    const gig = userGig.gig;
    return {
      ...gig,
      status: userGig.status,
      proposal: userGig.proposal,
      userGigId: userGig.id,
    };
  };

  const ensureUserGigForUser = async (userId: string, gigId: string) => {
    const existing = await prisma.userGig.findUnique({
      where: { userId_gigId: { userId, gigId } },
      include: { gig: true },
    });

    if (existing) return existing;

    return prisma.userGig.create({
      data: {
        userId,
        gigId,
        status: "NEW",
        proposal: null,
      },
      include: { gig: true },
    });
  };

  // 1. Trigger Scraper
  app.post("/api/scrape", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { platform } = req.body;
      const pages = 2; // Scrape 2 pages by default for deeper search
      let gigs = [];

      const targetPlatform = platform === "khamsat" ? "Khamsat" : "Mostaql";

      if (platform === "khamsat") {
        console.log("[SCRAPER] Starting Khamsat scraping...");
        gigs = await KhamsatScraper.fetchLatestGigs(pages);
      } else {
        console.log("[SCRAPER] Starting Mostaql scraping...");
        gigs = await MostaqlScraper.fetchLatestGigs(pages);
      }

      // Filter by user skills if provided
      const userSkills = req.body.skills;
      if (userSkills && Array.isArray(userSkills) && userSkills.length > 0) {
        const initialCount = gigs.length;
        gigs = gigs.filter((gig) => {
          const textToSearch = (gig.title + " " + gig.description + " " + (gig.requiredSkills || []).join(" ")).toLowerCase();
          return userSkills.some((s: string) => textToSearch.includes(s.toLowerCase()));
        });
        console.log(`[SCRAPER] Skills filter applied: kept ${gigs.length}/${initialCount} gigs matching user profile.`);
      }

      let newCount = 0;
      for (const gig of gigs) {
        try {
          await prisma.gig.upsert({
            where: { url: gig.url },
            update: {
              title: gig.title,
              description: gig.description,
              budget: gig.budget,
              requiredSkills: gig.requiredSkills.join(", "),
            },
            create: {
              title: gig.title,
              description: gig.description,
              budget: gig.budget,
              url: gig.url,
              platform: targetPlatform,
              requiredSkills: gig.requiredSkills.join(", "),
            },
          });
          newCount++;
        } catch (dbError) {
          console.warn(`[DB] Could not save gig ${gig.url}:`, dbError);
        }
      }

      console.log(`[SCRAPER] Completed: ${newCount}/${gigs.length} gigs processed for ${targetPlatform}`);
      res.json({ message: "Scraping completed", total: gigs.length, processed: newCount });
    } catch (error) {
      console.error("[SCRAPER] Failed:", error);
      res.status(500).json({ error: "Scraping failed. The target site may be blocking requests." });
    }
  });

  // 2. Fetch Gigs
  app.get("/api/gigs", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, search } = req.query;
      const userGigRows = await prisma.userGig.findMany({
        where: { userId: req.user.id },
        include: { gig: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      const existingGigIds = new Set(userGigRows.map((row) => row.gigId));
      const globalGigRows = await prisma.gig.findMany({
        where: search ? {
          OR: [
            { title: { contains: search as string } },
            { description: { contains: search as string } },
            { requiredSkills: { contains: search as string } },
          ],
        } : undefined,
        orderBy: { scrapedAt: "desc" },
        take: 200,
      });

      for (const gig of globalGigRows) {
        if (!existingGigIds.has(gig.id)) {
          await prisma.userGig.create({
            data: {
              userId: req.user.id,
              gigId: gig.id,
              status: "NEW",
              proposal: null,
            },
          });
          existingGigIds.add(gig.id);
        }
      }

      const refreshedUserGigs = await prisma.userGig.findMany({
        where: {
          userId: req.user.id,
          ...(status && status !== "ALL" ? { status: status as string } : {}),
          ...(search ? { gig: {
            OR: [
              { title: { contains: search as string } },
              { description: { contains: search as string } },
              { requiredSkills: { contains: search as string } },
            ],
          } } : {}),
        },
        include: { gig: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });

      res.json(refreshedUserGigs.map(serializeUserGig));
    } catch (error) {
      console.error("[API] Failed to fetch gigs:", error);
      res.status(500).json({ error: "Failed to fetch gigs" });
    }
  });

  // 3. Update Gig Status
  app.patch("/api/gigs/:id/status", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status } = req.body;
      const validStatuses = ["NEW", "VIEWED", "PROPOSAL_READY", "APPLIED", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const userGig = await ensureUserGigForUser(req.user.id, req.params.id);
      const updated = await prisma.userGig.update({
        where: { id: userGig.id },
        data: { status },
        include: { gig: true },
      });
      res.json(serializeUserGig(updated));
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // 3b. Update Gig Proposal (save edited proposal text)
  app.patch("/api/gigs/:id/proposal", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { proposal } = req.body;
      if (typeof proposal !== "string") {
        return res.status(400).json({ error: "Invalid proposal text" });
      }
      const userGig = await ensureUserGigForUser(req.user.id, req.params.id);
      const updated = await prisma.userGig.update({
        where: { id: userGig.id },
        data: { proposal, status: "PROPOSAL_READY" },
        include: { gig: true },
      });
      res.json(serializeUserGig(updated));
    } catch (error) {
      res.status(500).json({ error: "Failed to save proposal" });
    }
  });


  // 4. Generate AI Proposal
  app.post("/api/generate-proposal", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { gigId, userSkills, userName, userBio, language } = req.body;
      const gig = await prisma.gig.findUnique({ where: { id: gigId } });
      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const proposal = await generateProposal({
        gig,
        userSkills: userSkills || [],
        userName: userName || "Freelancer",
        userBio: userBio || "",
        apiKey,
        language: language || "arabic",
      });

      const userGig = await ensureUserGigForUser(req.user.id, gigId);
      await prisma.userGig.update({
        where: { id: userGig.id },
        data: { proposal, status: "PROPOSAL_READY" },
      });

      res.json({ proposal });
    } catch (error: any) {
      console.error("[AI] Proposal generation failed:", error);
      res.status(500).json({ error: error.message || "Proposal generation failed" });
    }
  });

  // 4b. Test API Key
  app.post("/api/test-key", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: "Say: OK",
      });
      if (response.text) {
        res.json({ valid: true });
      } else {
        res.status(400).json({ error: "Empty response" });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid key" });
    }
  });

  // 4c. Delete all gigs
  app.delete("/api/gigs/all", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await prisma.userGig.deleteMany({ where: { userId: req.user.id } });
      res.json({ message: "All user gig state deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gigs" });
    }
  });

  // 5. User Profile (Onboarding)
  app.post("/api/user/skills", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name, bio, skills } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name,
          bio,
          skills: {
            set: [],
            connectOrCreate: (skills || []).map((s: string) => ({
              where: { name: s },
              create: { name: s },
            })),
          },
        },
        include: { skills: true },
      });
      res.json(user);
    } catch (error) {
      console.error("[API] Onboarding failed:", error);
      res.status(500).json({ error: "Onboarding failed" });
    }
  });

  app.get("/api/user/:email", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.email !== req.params.email) {
      return res.status(403).json({ error: "You can only access your own profile" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { skills: true },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "User not found" });
    }
  });

  // 6. Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userGigs = await prisma.userGig.findMany({
        where: { userId: req.user.id },
        select: { status: true },
      });
      const totalGigs = userGigs.length;
      const newGigs = userGigs.filter((gig) => gig.status === "NEW").length;
      const appliedGigs = userGigs.filter((gig) => gig.status === "APPLIED").length;
      const archivedGigs = userGigs.filter((gig) => gig.status === "ARCHIVED").length;
      const totalUsers = await prisma.user.count();
      res.json({ totalGigs, newGigs, appliedGigs, archivedGigs, totalUsers });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ── Vite middleware for development ────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  ⚡ GigFlow Engine running at http://localhost:${PORT}\n`);
  });
}

startServer();
