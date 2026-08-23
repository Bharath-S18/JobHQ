import dotenv from "dotenv";
dotenv.config({ override: true });
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
import { enrichJob, fetchGreenhouseJob, fetchLeverJob, scrapeJobFromUrl } from "./src/jobEnrich.js";
import { scoutAllPortals } from "./src/scrapers/portalManager.js";
import {
  tailorApplication,
  scoreMatch,
  evaluate5DFit,
  runDrafterReviewerPipeline,
  generateCrmFollowup,
  generateInterviewBriefing,
  evaluateInterviewTurn,
  aggregateUpskillGaps,
} from "./src/tailor.js";
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
  cleanupDuplicateJobs,
} from "./src/db.js";

// Run one-time database duplicate cleaner and source normalizer on startup
try {
  const cleanupStats = cleanupDuplicateJobs();
  if (cleanupStats.removedCount > 0 || cleanupStats.updatedSources > 0) {
    console.log(`[DB Cleaner] Deduplicated ${cleanupStats.removedCount} jobs, normalized ${cleanupStats.updatedSources} sources.`);
  }
} catch (e) {}

const app = express();
app.use(express.json());

const clientDistPath = path.resolve("./client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
} else {
  app.use(express.static("public"));
}

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

// ---------- GitHub Competency Extractor (/expand) ----------

app.post("/api/profile/github-scan", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "GitHub username is required" });

    const ghUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`;
    const ghRes = await fetch(ghUrl, {
      headers: {
        "User-Agent": "JobHQ-Career-Agent",
        "Accept": "application/vnd.github.v3+json",
      },
    });

    if (!ghRes.ok) {
      if (ghRes.status === 404) {
        return res.status(404).json({ error: `GitHub user @${username} not found` });
      }
      throw new Error(`GitHub API returned status ${ghRes.status}`);
    }

    const repos = await ghRes.json();
    if (!Array.isArray(repos)) {
      return res.status(400).json({ error: "Invalid repository list received from GitHub" });
    }

    const languageCounts = {};
    const extractedCompetencies = [];
    const notableRepos = [];

    for (const repo of repos) {
      if (repo.fork) continue;
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }

      if (repo.stargazers_count > 0 || repo.description || repo.topics?.length > 0) {
        notableRepos.push({
          name: repo.name,
          description: repo.description || "",
          language: repo.language || "General",
          stars: repo.stargazers_count || 0,
          url: repo.html_url,
          topics: repo.topics || [],
        });
      }
    }

    for (const [lang, count] of Object.entries(languageCounts)) {
      const confidence = Math.min(98, 70 + count * 6);
      extractedCompetencies.push({
        skill: lang,
        category: "Programming Language",
        source: `${username} (${count} repositories)`,
        score: confidence,
      });
    }

    const allTopics = repos.flatMap((r) => r.topics || []);
    const uniqueTopics = [...new Set(allTopics)];
    for (const topic of uniqueTopics) {
      if (["react", "nextjs", "vue", "angular", "node", "express", "tailwind", "fastapi", "django", "docker", "kubernetes", "graphql", "typescript"].includes(topic.toLowerCase())) {
        extractedCompetencies.push({
          skill: topic.toUpperCase(),
          category: "Framework / Technology",
          source: `GitHub Topics (@${username})`,
          score: 88,
        });
      }
    }

    res.json({
      ok: true,
      username,
      totalRepos: repos.length,
      competencies: extractedCompetencies,
      notableRepos: notableRepos.slice(0, 6),
    });
  } catch (err) {
    console.error("[GitHub Scan Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- STAR Story Bank CRUD ----------

app.post("/api/profile/star-story", (req, res) => {
  try {
    const { story } = req.body;
    if (!story || !story.title) return res.status(400).json({ error: "Story title is required" });

    const profile = getProfile();
    const structured = profile?.structured || {};
    const starBank = Array.isArray(structured.starBank) ? [...structured.starBank] : [];

    const storyId = story.id || Date.now().toString();
    const updatedStory = { ...story, id: storyId, updatedAt: new Date().toISOString() };

    const existingIdx = starBank.findIndex((s) => s.id === storyId);
    if (existingIdx >= 0) {
      starBank[existingIdx] = updatedStory;
    } else {
      starBank.unshift(updatedStory);
    }

    structured.starBank = starBank;
    saveProfile(profile?.resume_text || "", structured);
    res.json({ ok: true, story: updatedStory, starBank });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/profile/star-story/:id", (req, res) => {
  try {
    const profile = getProfile();
    const structured = profile?.structured || {};
    const starBank = Array.isArray(structured.starBank) ? structured.starBank.filter((s) => s.id !== req.params.id) : [];

    structured.starBank = starBank;
    saveProfile(profile?.resume_text || "", structured);
    res.json({ ok: true, starBank });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// ---------- Multi-Portal Live Search Engine (LinkedIn, Indeed, Naukri, Wellfound) ----------

app.post("/api/scrapers/run", async (req, res) => {
  try {
    const { portals, query, location, limit } = req.body;
    const results = await scoutAllPortals({
      portals: Array.isArray(portals) ? portals : ["linkedin", "indeed", "naukri", "wellfound"],
      query: query || "Software Engineer",
      location: location || "India",
      limitPerPortal: limit || 10,
    });
    res.json(results);
  } catch (err) {
    console.error("[Multi-Portal Scout Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Direct URL Scraper & 5D Ranking Engine ----------

app.post("/api/jobs/cleanup-duplicates", (req, res) => {
  try {
    const result = cleanupDuplicateJobs();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jobs/scrape-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Job URL is required" });

    const scraped = await scrapeJobFromUrl(url);
    upsertJob(scraped);

    const saved = listJobs().find((j) => j.url === scraped.url || j.url === scraped.finalUrl);
    if (!saved) return res.status(500).json({ error: "Failed to save scraped job" });

    // Automatically calculate 5-dimension fit against candidate master profile
    const profile = getProfile();
    if (profile?.resume_text || profile?.structured) {
      const fitResult = await evaluate5DFit({
        resumeText: profile.resume_text,
        structured: profile.structured,
        jobTitle: saved.title,
        company: saved.company,
        jobDescription: saved.description,
      });

      updateJobMatch(saved.id, {
        score: fitResult.compositeScore,
        reason: fitResult.summary,
      });

      return res.json({
        ok: true,
        job: {
          ...saved,
          match_score: fitResult.compositeScore,
          match_reason: fitResult.summary,
          fit5D: fitResult,
        },
      });
    }

    res.json({ ok: true, job: saved });
  } catch (err) {
    console.error("[Scrape URL Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jobs/:id/rank", async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const profile = getProfile();
    if (!profile || (!profile.resume_text && !profile.structured)) {
      return res.status(400).json({ error: "Upload your resume in Profile Studio first to rank jobs" });
    }

    const fitResult = await evaluate5DFit({
      resumeText: profile.resume_text,
      structured: profile.structured,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
    });

    updateJobMatch(job.id, {
      score: fitResult.compositeScore,
      reason: fitResult.summary,
    });

    res.json({
      ok: true,
      jobId: job.id,
      matchScore: fitResult.compositeScore,
      matchReason: fitResult.summary,
      fit5D: fitResult,
    });
  } catch (err) {
    console.error("[Rank Job Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jobs/rank-all", async (req, res) => {
  try {
    const profile = getProfile();
    if (!profile || (!profile.resume_text && !profile.structured)) {
      return res.status(400).json({ error: "Upload your resume in Profile Studio first to rank jobs" });
    }

    const allJobs = listJobs();
    const rankedResults = [];

    for (const job of allJobs) {
      const fitResult = await evaluate5DFit({
        resumeText: profile.resume_text,
        structured: profile.structured,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
      });

      updateJobMatch(job.id, {
        score: fitResult.compositeScore,
        reason: fitResult.summary,
      });

      rankedResults.push({
        id: job.id,
        title: job.title,
        company: job.company,
        score: fitResult.compositeScore,
        recommendation: fitResult.recommendation,
        reason: fitResult.summary,
        fit5D: fitResult,
      });
    }

    res.json({ ok: true, rankedCount: rankedResults.length, results: rankedResults });
  } catch (err) {
    console.error("[Rank All Error]:", err);
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

    const result = await runDrafterReviewerPipeline({
      resumeText: profile.resume_text,
      structured: profile.structured,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
    });

    updateJobTailoring(job.id, {
      resumeBullets: result.resumeBullets,
      coverLetter: result.coverLetter,
    });

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

// ---------- CRM Follow-ups, Interview Hub & Upskill Analytics ----------

app.post("/api/crm/generate-followup", async (req, res) => {
  try {
    const { jobId, type, notes } = req.body;
    let job = null;
    if (jobId) job = getJob(jobId);
    const profile = getProfile();
    const result = await generateCrmFollowup({
      type: type || "followup",
      jobTitle: job?.title,
      company: job?.company,
      candidateName: profile?.structured?.personalInfo?.fullName,
      profile,
      notes: notes || job?.notes || "",
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/interview/briefing", async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = jobId ? getJob(jobId) : null;
    const profile = getProfile();
    const briefing = await generateInterviewBriefing({
      jobTitle: job?.title,
      company: job?.company,
      jobDescription: job?.description,
      profile,
    });
    res.json(briefing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/interview/chat", async (req, res) => {
  try {
    const { jobId, conversation, latestAnswer } = req.body;
    const job = jobId ? getJob(jobId) : null;
    const profile = getProfile();
    const evaluation = await evaluateInterviewTurn({
      jobTitle: job?.title,
      company: job?.company,
      conversation: conversation || [],
      latestAnswer: latestAnswer || "",
      profile,
    });
    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics/upskill-heatmap", (req, res) => {
  try {
    const jobs = listJobs();
    const profile = getProfile();
    const gaps = aggregateUpskillGaps({ jobs, profile });
    res.json(gaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/analytics/add-skill-to-profile", (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill) return res.status(400).json({ error: "Skill required" });
    const profile = getProfile() || { structured: {} };
    const structured = profile.structured || {};
    structured.skills = structured.skills || {};
    structured.skills.technical = structured.skills.technical || [];

    const lower = skill.toLowerCase().trim();
    if (!structured.skills.technical.some((s) => s.toLowerCase().trim() === lower)) {
      structured.skills.technical.push(skill);
      saveProfile(profile.resume_text || "", structured);
    }
    res.json({ ok: true, skills: structured.skills.technical });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Multi-Portal Job Scout System ----------

app.get("/api/hunter/status", (req, res) => {
  res.json({
    ok: true,
    engine: "lightweight-public-scout",
    portals: ["linkedin", "indeed", "naukri", "wellfound"],
    browserRequired: false,
  });
});

app.post("/api/hunter/run-once", async (req, res) => {
  try {
    const profile = getProfile();
    const query = profile?.structured?.desiredRole || "Software Engineer";
    const location = profile?.structured?.targetLocation || "India";
    const result = await scoutAllPortals({
      portals: ["linkedin", "indeed", "naukri", "wellfound"],
      query,
      location,
      limitPerPortal: 6,
    });
    res.json(result);
  } catch (err) {
    console.error("[Hunter Run Error]:", err);
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
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY || dbSettings.geminiKey),
    anthropicKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY || dbSettings.anthropicKey),
    provider: process.env.TAILOR_PROVIDER || dbSettings.tailorProvider || (process.env.GEMINI_API_KEY ? "gemini" : "local-verified"),
  });
});

app.post("/api/settings", (req, res) => {
  try {
    const { employmentType, targetLocation, provider, geminiKey, anthropicKey } = req.body;
    if (employmentType) saveSetting("employmentType", employmentType);
    if (targetLocation) saveSetting("targetLocation", targetLocation);
    if (provider) {
      process.env.TAILOR_PROVIDER = provider;
      saveSetting("tailorProvider", provider);
    }
    if (geminiKey) {
      process.env.GEMINI_API_KEY = geminiKey;
      saveSetting("geminiKey", geminiKey);
    }
    if (anthropicKey) {
      process.env.ANTHROPIC_API_KEY = anthropicKey;
      saveSetting("anthropicKey", anthropicKey);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA client fallback for non-API route reloads
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return next();
  }
  const indexPath = path.resolve("./client/dist/index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.sendFile(path.resolve("./public/index.html"));
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Job tracker running at http://localhost:${PORT}`));
