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

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve("dev.db")}` });
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

  // 1. Trigger Scraper
  app.post("/api/scrape", async (req, res) => {
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
    try {
      const { status, search } = req.query;
      const where: any = {};
      if (status && status !== "ALL") {
        where.status = status as string;
      }
      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { description: { contains: search as string } },
          { requiredSkills: { contains: search as string } },
        ];
      }
      const gigs = await prisma.gig.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        take: 100,
      });
      res.json(gigs);
    } catch (error) {
      console.error("[API] Failed to fetch gigs:", error);
      res.status(500).json({ error: "Failed to fetch gigs" });
    }
  });

  // 3. Update Gig Status
  app.patch("/api/gigs/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["NEW", "VIEWED", "APPLIED", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const gig = await prisma.gig.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json(gig);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // 3b. Update Gig Proposal (save edited proposal text)
  app.patch("/api/gigs/:id/proposal", async (req, res) => {
    try {
      const { proposal } = req.body;
      if (typeof proposal !== "string") {
        return res.status(400).json({ error: "Invalid proposal text" });
      }
      const gig = await prisma.gig.update({
        where: { id: req.params.id },
        data: { proposal },
      });
      res.json(gig);
    } catch (error) {
      res.status(500).json({ error: "Failed to save proposal" });
    }
  });


  // 4. Generate AI Proposal
  app.post("/api/generate-proposal", async (req, res) => {
    try {
      const { gigId, userSkills, userName, userBio, apiKey: bodyApiKey, language } = req.body;
      const gig = await prisma.gig.findUnique({ where: { id: gigId } });
      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }

      // Allow API key from request body (from Settings) or env
      const apiKey = bodyApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        return res.status(400).json({ error: "GEMINI_API_KEY not configured. Add your key in Settings or .env.local" });
      }

      const proposal = await generateProposal({
        gig,
        userSkills: userSkills || [],
        userName: userName || "Freelancer",
        userBio: userBio || "",
        apiKey,
        language: language || "arabic",
      });

      // Save proposal to gig
      await prisma.gig.update({
        where: { id: gigId },
        data: { proposal, status: "APPLIED" },
      });

      res.json({ proposal });
    } catch (error: any) {
      console.error("[AI] Proposal generation failed:", error);
      res.status(500).json({ error: error.message || "Proposal generation failed" });
    }
  });

  // 4b. Test API Key
  app.post("/api/test-key", async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "No key provided" });
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
    try {
      await prisma.gig.deleteMany({});
      res.json({ message: "All gigs deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gigs" });
    }
  });

  // 5. User Profile (Onboarding)
  app.post("/api/user/skills", async (req, res) => {
    const { email, name, bio, skills } = req.body;
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          bio,
          skills: {
            set: [],
            connectOrCreate: skills.map((s: string) => ({
              where: { name: s },
              create: { name: s },
            })),
          },
        },
        create: {
          email,
          name,
          bio,
          skills: {
            connectOrCreate: skills.map((s: string) => ({
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
    try {
      const user = await prisma.user.findUnique({
        where: { email: req.params.email },
        include: { skills: true },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "User not found" });
    }
  });

  // 6. Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const totalGigs = await prisma.gig.count();
      const newGigs = await prisma.gig.count({ where: { status: "NEW" } });
      const appliedGigs = await prisma.gig.count({ where: { status: "APPLIED" } });
      const archivedGigs = await prisma.gig.count({ where: { status: "ARCHIVED" } });
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
