import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomInt } from "crypto";
import { z } from "zod";
import { WebsiteCrawler } from "./services/websiteCrawler";
import { generateWebsitePdf } from "./services/pdf";
import { createAinagerAndDocumentMySql } from "./services/ainagerMysql";
import { ensureMysqlConnection } from "./db/mysql";
import { EmailService } from "./services/email";

// Common free/public email providers we do not allow
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "hey.com",
  "duck.com",
]);

function isCompanyEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  if (!domain.includes(".")) return false; // must be a real domain
  return !FREE_EMAIL_DOMAINS.has(domain);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Request OTP (server-generated & rate-limited)
  app.post("/api/auth/request-otp", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodySchema = z.object({ email: z.string().email() });
      const { email } = bodySchema.parse(req.body);

      // Only accept company emails (reject common free providers)
      if (!isCompanyEmail(email)) {
        return res.status(400).json({ ok: false, message: "Please use your company email address." });
      }

      // prevent spamming OTP requests if one is already active
      const hasActive = await storage.hasActiveOtp(email);
      if (hasActive) {
        return res.status(429).json({ ok: false, message: "OTP already sent. Please wait a few minutes before requesting another." });
      }

      // generate a 6-digit OTP
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      await storage.saveOtp(email, code, expiresAt);

      console.log(`OTP sent to ${email}: ${code}`);

      // Send OTP via provider (resend/sendgrid) or dev-log
      await EmailService.sendOtp(email, code);

      return res.json(true);
    } catch (err) {
      next(err);
    }
  });

  // Verify OTP then analyze website
  app.post("/api/auth/verify-otp", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
      const { email, code } = bodySchema.parse(req.body);

      // Verify server-side
      const valid = await storage.verifyOtp(email, code);
      if (!valid) {
        return res.status(400).json({ ok: false, message: "Invalid or expired code" });
      }

      // Analyze website
      let websiteAnalysis;
      try {
        websiteAnalysis = await WebsiteCrawler.analyzeWebsiteFromEmail(email);
        console.log(`Website analysis completed for ${email}:`, {
          domain: websiteAnalysis.domain,
          title: websiteAnalysis.title,
          contentLength: websiteAnalysis.content.length
        });
        // Log generated instruction and full content for verification
        console.log(`\n----- Instruction for ${email} -----\n` + websiteAnalysis.instruction + "\n-----------------------------------\n");
        console.log(`\n----- Full content for ${email} (${websiteAnalysis.content.length} chars) -----\n` + websiteAnalysis.content + "\n-----------------------------------\n");
      } catch (websiteError) {
        console.error(`Website analysis failed for ${email}:`, websiteError);
        return res.status(400).json({ 
          ok: false, 
          message: "Could not analyze company website. Please ensure the email domain has a valid website." 
        });
      }

      // Store website analysis for later use
      await storage.saveWebsiteAnalysis(email, websiteAnalysis);

      return res.json({ 
        ok: true,
        websiteInfo: {
          domain: websiteAnalysis.domain,
          title: websiteAnalysis.title,
          description: websiteAnalysis.description
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Create ainager: uses stored website analysis to create ainager with real instruction and knowledge base
  app.post("/api/ainager/create", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodySchema = z.object({
        email: z.string().email(),
      });
      const { email } = bodySchema.parse(req.body);

      // Get stored website analysis
      const websiteAnalysis = await storage.getWebsiteAnalysis(email);
      if (!websiteAnalysis) {
        return res.status(400).json({ 
          ok: false, 
          message: "Website analysis not found. Please restart the process." 
        });
      }

      // Use real instruction and knowledge base from website analysis
      const instruction = websiteAnalysis.instruction;
      const knowledgeBase = websiteAnalysis.knowledgeBase;
      const knowledgeBaseBytes = Buffer.byteLength(knowledgeBase, 'utf8');

      // Generate a PDF from website content/knowledge base and store path
      const pdfFilePath = await generateWebsitePdf({
        domain: websiteAnalysis.domain,
        title: websiteAnalysis.title,
        description: websiteAnalysis.description,
        content: websiteAnalysis.content,
        knowledgeBase: websiteAnalysis.knowledgeBase,
      });

      // Persist into MySQL (chat_ainager, chat_document)
      const { ainagerId, documentId, ainagerName } = await createAinagerAndDocumentMySql({
        email,
        companyName: websiteAnalysis.title,
        instruction,
        knowledgeBase,
        websiteDomain: websiteAnalysis.domain,
        websiteDescription: websiteAnalysis.description,
        pdfFilePath,
      });

      // Use ainagerName for shareable link
      const shareableLink = `https://www.ainager.com/w/${ainagerName}`;

      return res.json({ 
        ok: true, 
        ainagerName, 
        shareableLink, 
        instruction, 
        knowledgeBaseBytes, 
        email,
        companyName: websiteAnalysis.title,
        ainagerId,
        documentId,
        websiteInfo: {
          domain: websiteAnalysis.domain,
          title: websiteAnalysis.title,
          description: websiteAnalysis.description
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Simple DB health check
  app.get("/api/db/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureMysqlConnection();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
