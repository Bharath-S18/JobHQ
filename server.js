import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { renderResumeHtml } from "./src/resumeRenderer.js";
import { extractTextFromBuffer, parseResumeText } from "./src/resume_parser.js";
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getAuthedClient,
  hasStoredTokens,
  fetchGoogleUserProfile,
  getStoredUserProfile,
} from "./src/gmailAuth.js";
import { fetchLinkedInJobAlerts } from "./src/parseLinkedInAlerts.js";
import { enrichJob, fetchGreenhouseJob, fetchLeverJob } from "./src/jobEnrich.js";
import { tailorApplication, scoreMatch } from "./src/tailor.js";
import {
  runHunterOnce,
  getHunterStatus,
} from "./src/hunter/hunterEngine.js";
import {
  launchUserLoginWindow,
  checkLinkedInSession,
  closeManagedBrowser,
} from "./src/hunter/browserSession.js";
import {
  saveProfile,
  getProfile,
  upsertJob,
  listJobs,
  getJob,
  updateJobMatch,
  updateJobTailoring,
  updateJobStatus,
  deleteJob,
  insertManualJob,
  saveUser,
  getUserByEmail,
  saveSetting,
  getSetting,
  getAllSettings,
  listHunterTasks,
  listAgentRuns,
  getJobMatch,
  getApplicationEvents,
  getTelemetryFeed,
  getGmailAlertsList,
} from "./src/db.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------- Master Profile & Resume Parsing ----------

app.get("/api/profile", (req, res) => {
  const profile = getProfile();
  if (!profile) return res.json({ resumeText: "", resume_text: "", structured: null });
  res.json({
    resumeText: profile.resume_text,
    resume_text: profile.resume_text,
    structured: profile.structured,
    updatedAt: profile.updated_at,
  });
});

app.post("/api/profile", (req, res) => {
  try {
    const { resumeText, structured } = req.body;
    if (!resumeText && !structured) {
      return res.status(400).json({ error: "No profile data provided" });
    }
    saveProfile(resumeText || "", structured || null);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profile/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf") ||
      (req.file.buffer && req.file.buffer.slice(0, 4).toString() === "%PDF");

    if (!isPdf) {
      return res.status(400).json({
        error: "Strict PDF upload policy: Please upload a standard .pdf resume file.",
      });
    }

    const extraction = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    const text = typeof extraction === "string" ? extraction : extraction?.text || "";

    if (!text || text.trim().length < 20) {
      return res.status(400).json({
        error: "Could not extract readable text from the uploaded PDF resume. Please ensure it is not an image-only scan.",
      });
    }

    const structured = parseResumeText(text);
    fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync("./data/master_resume.pdf", req.file.buffer);
    saveProfile(text, structured);

    res.json({
      ok: true,
      text,
      extractedText: text,
      structured,
      parsed: structured,
      fileName: req.file.originalname,
      fileSize: `${Math.round(req.file.size / 1024)} KB`,
      message: "Resume uploaded, verified, and parsed into Master Profile successfully.",
    });
  } catch (err) {
    console.error("[Upload Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/profile/resume-file", (req, res) => {
  const profile = getProfile();
  const pdfPath = path.resolve("./data/master_resume.pdf");

  if (fs.existsSync(pdfPath)) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      (req.query.download === "pdf" ? "attachment" : "inline") +
        `; filename="${encodeURIComponent(profile?.structured?.masterResumeFile?.fileName || "Resume.pdf")}"`
    );
    return fs.createReadStream(pdfPath).pipe(res);
  }

  // Return clean empty message when no resume is uploaded (no dummy resume)
  res.status(404).send(`<!DOCTYPE html><html><body style="background:#18181b; color:#a1a1aa; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; text-align:center;"><div><p style="font-size:16px; font-weight:600; color:#f4f4f5;">No Resume Uploaded Yet</p><p style="font-size:13px;">Please upload your PDF resume to view it here.</p></div></body></html>`);
});

// ---------- Google OAuth & Gmail Alerts ----------

const getAuthStatusHandler = (req, res) => {
  const isConnected = hasStoredTokens();
  const user = getStoredUserProfile();
  res.json({
    connected: isConnected,
    user: user || (isConnected ? { name: "Google Account", email: "Connected" } : null),
  });
};

app.get("/api/auth/status", getAuthStatusHandler);
app.get("/auth/status", getAuthStatusHandler);

app.get("/auth/google", (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    res.status(500).send(`OAuth Configuration Error: ${err.message}`);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing OAuth code");
  try {
    const tokens = await exchangeCodeForTokens(code);
    await fetchGoogleUserProfile(tokens);
    res.redirect("/?gmail=connected");
  } catch (err) {
    console.error("[OAuth Error]:", err);
    res.status(500).send(`Auth Failed: ${err.message}`);
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    if (fs.existsSync("./data/tokens.json")) fs.unlinkSync("./data/tokens.json");
    if (fs.existsSync("./data/user_profile.json")) fs.unlinkSync("./data/user_profile.json");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/scan", async (req, res) => {
  try {
    const authClient = await getAuthedClient();
    if (!authClient) {
      return res.status(401).json({ error: "Connect your Google account first to scan Gmail alerts" });
    }

    const profile = getProfile();
    if (!profile || !profile.resume_text) {
      return res.status(400).json({ error: "Upload your resume first" });
    }

    const rawJobs = await fetchLinkedInJobAlerts(authClient);
    const results = [];

    for (const raw of rawJobs) {
      const enriched = await enrichJob(raw);
      upsertJob(enriched);
      const saved = listJobs().find((j) => j.url === enriched.url);
      if (!saved) continue;

      const { score, reason } = await scoreMatch({
        resumeText: profile.resume_text,
        structured: profile.structured,
        jobTitle: enriched.title,
        jobDescription: enriched.description,
      });
      updateJobMatch(saved.id, { score, reason });
      results.push({ ...saved, match_score: score, match_reason: reason });
    }

    res.json({ scanned: rawJobs.length, jobs: results });
  } catch (err) {
    console.error("[Scan Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Jobs CRUD & Seed Data ----------

app.get("/api/jobs", (req, res) => {
  res.json(listJobs({ status: req.query.status, source: req.query.source }));
});

app.get("/api/gmail/alerts", (req, res) => {
  res.json(getGmailAlertsList());
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});

app.post("/api/jobs", (req, res) => {
  try {
    const { title, company, url, finalUrl, description, ats, matchScore, matchReason, status } = req.body;
    if (!title) return res.status(400).json({ error: "Job title is required" });
    const result = insertManualJob({
      title,
      company,
      url,
      finalUrl,
      description,
      ats,
      matchScore,
      matchReason,
      status: status || "new",
    });
    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/jobs/:id", (req, res) => {
  try {
    deleteJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jobs/sample", (req, res) => {
  try {
    const sampleJobs = [
      {
        title: "Frontend Engineering Intern",
        company: "Razorpay",
        url: "https://boards.greenhouse.io/razorpay/jobs/5918231",
        finalUrl: "https://razorpay.com/careers/frontend-intern",
        description: "Razorpay is looking for talented Frontend Engineering Interns to build high-performance checkout and payments UI.\n\nRequirements:\n- Strong knowledge of React, JavaScript, and modern CSS / Tailwind.\n- Passion for fluid UI animations and accessible design systems.",
        ats: "greenhouse",
        atsBoard: "razorpay",
        atsJobId: "5918231",
        canAutoSubmit: 1,
        matchScore: 92,
        matchReason: "Strong alignment with candidate's React, Tailwind, and frontend architecture skills.",
        status: "tailored",
        tailoredResume: "- Built responsive, accessible checkout UI components using React and TypeScript.\n- Optimized client-side bundle performance and asset loading.",
        tailoredCoverLetter: "Dear Hiring Team at Razorpay,\n\nI am thrilled to apply for the Frontend Engineering Intern position at Razorpay. Having built full-stack React dashboards, I admire Razorpay's engineering standards...",
      },
      {
        title: "Software Development Intern",
        company: "Swiggy",
        url: "https://jobs.lever.co/swiggy/9d8b72e1-4c12-4211-9a99-b130a0d7f991",
        finalUrl: "https://swiggy.careers/intern-sde",
        description: "Join the Swiggy core platform team to build scalable microservices and real-time order tracking workflows.\n\nRequirements:\n- Proficiency in Node.js, Express, and REST APIs.\n- Understanding of SQL databases and concurrency.",
        ats: "lever",
        atsBoard: "swiggy",
        atsJobId: "9d8b72e1-4c12-4211-9a99-b130a0d7f991",
        canAutoSubmit: 1,
        matchScore: 88,
        matchReason: "Direct match with candidate's Node.js backend projects and REST API architecture.",
        status: "new",
      },
      {
        title: "Full Stack Engineer (Entry Level)",
        company: "Linear",
        url: "https://jobs.lever.co/linear/3b4e9f1a-8210-410a-b100-c9a8b7d6e5f4",
        finalUrl: "https://linear.app/careers/fullstack-engineer",
        description: "We are looking for an Engineer to push the boundaries of desktop-grade web application speed, keyboard-first navigation, and fluid 120fps UI animations.",
        ats: "lever",
        atsBoard: "linear",
        atsJobId: "3b4e9f1a-8210-410a-b100-c9a8b7d6e5f4",
        canAutoSubmit: 1,
        matchScore: 84,
        matchReason: "Strong candidate match for high-performance React architecture and keyboard interaction paradigms.",
        status: "interviewing",
      }
    ];

    for (const job of sampleJobs) {
      upsertJob({
        title: job.title,
        company: job.company,
        url: job.url,
        finalUrl: job.finalUrl,
        description: job.description,
        ats: job.ats,
        atsBoard: job.atsBoard,
        atsJobId: job.atsJobId,
        canAutoSubmit: job.canAutoSubmit,
      });
      const saved = listJobs().find((j) => j.url === job.url);
      if (saved) {
        updateJobMatch(saved.id, { score: job.matchScore, reason: job.matchReason });
        if (job.tailoredResume && job.tailoredCoverLetter) {
          updateJobTailoring(saved.id, { resumeBullets: job.tailoredResume, coverLetter: job.tailoredCoverLetter });
        }
        updateJobStatus(saved.id, job.status);
      }
    }

    res.json({ ok: true, count: sampleJobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- AI Tailoring & Apply Payload ----------

app.post("/api/jobs/:id/tailor", async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const profile = getProfile();
    if (!profile) return res.status(400).json({ error: "Save your resume first" });

    const result = await tailorApplication({
      resumeText: profile.resume_text,
      structured: profile.structured,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
    });
    updateJobTailoring(job.id, result);
    res.json(result);
  } catch (err) {
    console.error("[Tailor Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jobs/:id/apply-info", async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "not found" });
    const profile = getProfile() || {};
    const p = profile.structured || {};
    const pi = p.personalInfo || {};
    const ap = p.applicationProfile || {};
    const prefs = p.jobPreferences || {};

    let posting = null;
    if (job.ats === "greenhouse" && job.ats_board && job.ats_job_id) {
      posting = await fetchGreenhouseJob(job.ats_board, job.ats_job_id);
    } else if (job.ats === "lever" && job.ats_board && job.ats_job_id) {
      posting = await fetchLeverJob(job.ats_board, job.ats_job_id);
    }

    const submissionPayload = {
      candidate: {
        fullName: pi.fullName || "Bharath S",
        email: pi.email || "bharath.s06101968@gmail.com",
        phone: pi.phone || "+91 9876543210",
        location: pi.location || "Bengaluru, India",
        linkedin: pi.linkedin || "https://linkedin.com/in/bharath-s",
        github: pi.github || "https://github.com/bharath-s",
        portfolio: pi.portfolio || "",
      },
      screeningAnswers: {
        workAuthorization: ap.workAuthorization || "Authorized to work in India",
        visaSponsorship: ap.visaSponsorship || "No sponsorship needed",
        expectedCTC: ap.expectedSalary || prefs.salaryMin || "₹10,00,000 / year",
        noticePeriod: prefs.noticePeriod || "Immediate",
      },
      tailoredMaterials: {
        resumeBullets: job.tailored_resume || "Standard verified bullets from Master Profile",
        coverLetter: job.tailored_cover_letter || "",
      },
      applicationTarget: {
        jobTitle: job.title,
        company: job.company,
        ats: job.ats,
        applyUrl: job.final_url || job.url,
      },
    };

    return res.json({
      ats: job.ats,
      posting,
      applyUrl: job.final_url || job.url,
      payload: submissionPayload,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jobs/:id/status", (req, res) => {
  try {
    updateJobStatus(req.params.id, req.body.status, req.body.note);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jobs/:id/events", (req, res) => {
  try {
    res.json(getApplicationEvents(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/jobs/:id/match", (req, res) => {
  try {
    const match = getJobMatch(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Self-Hosted Local Browser Job Hunter Engine ----------

app.post("/api/hunter/connect-browser", async (req, res) => {
  try {
    const result = await launchUserLoginWindow();
    res.json(result);
  } catch (err) {
    console.error("[Hunter Connect Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/hunter/status", (req, res) => {
  try {
    const status = getHunterStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hunter/run-once", async (req, res) => {
  try {
    const maxItems = Number(req.body.maxItems) || 6;
    const result = await runHunterOnce({ maxItems });
    res.json(result);
  } catch (err) {
    console.error("[Hunter Run Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hunter/close-browser", async (req, res) => {
  try {
    const result = await closeManagedBrowser();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/hunter/tasks", (req, res) => {
  res.json(listHunterTasks());
});

app.get("/api/hunter/telemetry", (req, res) => {
  res.json(getTelemetryFeed());
});

// ---------- Settings & Configuration ----------

app.get("/api/settings", (req, res) => {
  const dbSettings = getAllSettings();
  res.json({
    employmentType: dbSettings.employmentType || "internship",
    targetLocation: dbSettings.targetLocation || "Bengaluru",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    anthropicKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    provider: process.env.TAILOR_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "local-verified"),
  });
});

app.post("/api/settings", (req, res) => {
  try {
    const { employmentType, targetLocation } = req.body;
    if (employmentType) saveSetting("employmentType", employmentType);
    if (targetLocation) saveSetting("targetLocation", targetLocation);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Job tracker running at http://localhost:${PORT}`));
