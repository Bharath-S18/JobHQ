import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";

fs.mkdirSync("./data", { recursive: true });
const db = new Database("./data/jobs.db");

// Enable WAL mode for high concurrency & performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --------------------------------------------------------------------------
// 1. Database Schema (Normalized 10-Table Architecture)
// --------------------------------------------------------------------------
db.exec(`
-- 1. Candidate Master Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  resume_text TEXT,
  structured_data TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Legacy compatibility table alias
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  resume_text TEXT,
  data TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Job Search Query Templates
CREATE TABLE IF NOT EXISTS job_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  roles TEXT NOT NULL,       -- JSON array of strings
  locations TEXT,            -- JSON array of strings
  employment_type TEXT DEFAULT 'internship', -- 'internship' | 'fulltime' | 'both'
  experience_level TEXT DEFAULT 'entry',     -- 'entry' | 'mid' | 'senior'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Explicit Task Queue with Atomic Locking
CREATE TABLE IF NOT EXISTS hunter_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER,
  task_type TEXT NOT NULL DEFAULT 'job_search', -- 'job_search' | 'job_detail'
  query TEXT NOT NULL,
  search_url TEXT,
  status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
  scheduled_at TEXT NOT NULL,
  locked_at TEXT,
  worker_id TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error_message TEXT,
  FOREIGN KEY (search_id) REFERENCES job_searches(id) ON DELETE SET NULL
);

-- 4. Raw Scraped Source Staging (Decoupled Debugging & Re-Parsing)
CREATE TABLE IF NOT EXISTS raw_job_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  source TEXT NOT NULL DEFAULT 'linkedin',
  source_url TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parsed INTEGER DEFAULT 0,
  collected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES hunter_tasks(id) ON DELETE SET NULL
);

-- 5. Normalized Ingested Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'linkedin', -- 'linkedin' | 'gmail_alert' | 'direct'
  source_job_id TEXT,
  url TEXT UNIQUE NOT NULL,
  canonical_url TEXT,
  final_url TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  employment_type TEXT DEFAULT 'fulltime', -- 'internship' | 'fulltime' | 'contract'
  experience_level TEXT DEFAULT 'entry',   -- 'entry' | 'mid' | 'senior'
  workplace_type TEXT DEFAULT 'hybrid',    -- 'remote' | 'hybrid' | 'onsite'
  ats TEXT DEFAULT 'direct',
  application_url TEXT,
  posted_at TEXT,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  content_hash TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'closed'
  
  -- Legacy denormalized match & tailoring columns preserved for backward-compatibility
  match_score INTEGER,
  match_reason TEXT,
  tailored_resume TEXT,
  tailored_cover_letter TEXT,
  gmail_message_id TEXT,
  ats_board TEXT,
  ats_job_id TEXT,
  can_auto_submit INTEGER DEFAULT 0,
  received_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. AI Match Scoring Results (Detailed Breakdown)
CREATE TABLE IF NOT EXISTS job_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  profile_id INTEGER DEFAULT 1,
  score INTEGER NOT NULL,
  matched_skills TEXT,       -- JSON array
  missing_skills TEXT,       -- JSON array
  experience_match INTEGER DEFAULT 1,
  education_match INTEGER DEFAULT 1,
  concerns TEXT,             -- JSON array
  reasoning TEXT,
  model TEXT,
  prompt_version TEXT DEFAULT 'v1',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, profile_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 7. Tailored Documents (Versioned)
CREATE TABLE IF NOT EXISTS tailored_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  profile_id INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  tailored_resume TEXT NOT NULL,
  tailored_cover_letter TEXT,
  ai_provider TEXT DEFAULT 'gemini',
  model TEXT,
  prompt_version TEXT DEFAULT 'v1',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 8. Application Tracking Pipeline
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER UNIQUE NOT NULL,
  profile_id INTEGER DEFAULT 1,
  status TEXT DEFAULT 'NOT_APPLIED', -- 'NOT_APPLIED' | 'READY' | 'APPLIED' | 'ASSESSMENT' | 'INTERVIEW' | 'REJECTED' | 'OFFER' | 'WITHDRAWN'
  applied_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 9. Application Status Event History Ledger
CREATE TABLE IF NOT EXISTS application_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 10. Worker Run Telemetry & Observability
CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL, -- 'scout' | 'collector' | 'extractor' | 'matcher' | 'tailor'
  status TEXT NOT NULL,     -- 'STARTED' | 'SUCCESS' | 'FAILED' | 'PAUSED_CHALLENGE'
  items_processed INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_details TEXT
);

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workspace Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Safe Schema Migrations for existing databases
const migrations = [
  "ALTER TABLE jobs ADD COLUMN source TEXT DEFAULT 'linkedin'",
  "ALTER TABLE jobs ADD COLUMN source_job_id TEXT",
  "ALTER TABLE jobs ADD COLUMN location TEXT",
  "ALTER TABLE jobs ADD COLUMN last_seen_at TEXT",
  "ALTER TABLE jobs ADD COLUMN content_hash TEXT",
  "ALTER TABLE jobs ADD COLUMN final_url TEXT",
  "ALTER TABLE jobs ADD COLUMN canonical_url TEXT",
  "ALTER TABLE jobs ADD COLUMN employment_type TEXT DEFAULT 'fulltime'",
  "ALTER TABLE jobs ADD COLUMN experience_level TEXT DEFAULT 'entry'",
  "ALTER TABLE jobs ADD COLUMN workplace_type TEXT DEFAULT 'hybrid'",
  "ALTER TABLE jobs ADD COLUMN application_url TEXT",
  "ALTER TABLE jobs ADD COLUMN posted_at TEXT",
  "ALTER TABLE jobs ADD COLUMN updated_at TEXT",
  "ALTER TABLE profiles ADD COLUMN structured_data TEXT",
  "ALTER TABLE hunter_tasks ADD COLUMN locked_at TEXT",
  "ALTER TABLE hunter_tasks ADD COLUMN worker_id TEXT",
  "ALTER TABLE raw_job_sources ADD COLUMN parsed INTEGER DEFAULT 0",
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (e) {}
}

// --------------------------------------------------------------------------
// 2. Hash & Utility Helpers
// --------------------------------------------------------------------------
export function computeContentHash(title, company, description) {
  const content = `${title || ""}::${company || ""}::${(description || "").slice(0, 300)}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return crypto.createHash("sha256").update(content).digest("hex");
}

// --------------------------------------------------------------------------
// 3. Profiles CRUD
// --------------------------------------------------------------------------
export function saveProfile(resumeText, structuredData = null) {
  const jsonStr = structuredData
    ? typeof structuredData === "string"
      ? structuredData
      : JSON.stringify(structuredData)
    : null;

  db.prepare(
    `INSERT INTO profiles (id, resume_text, structured_data, updated_at) VALUES (1, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET resume_text = excluded.resume_text, structured_data = excluded.structured_data, updated_at = excluded.updated_at`
  ).run(resumeText, jsonStr);

  // Sync to legacy table for backward-compatibility
  db.prepare(
    `INSERT INTO profile (id, resume_text, data, updated_at) VALUES (1, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET resume_text = excluded.resume_text, data = excluded.data, updated_at = excluded.updated_at`
  ).run(resumeText, jsonStr);
}

export function getProfile() {
  try {
    const row = db.prepare(`SELECT * FROM profiles WHERE id = 1`).get();
    if (row && row.structured_data) {
      try {
        row.structured = JSON.parse(row.structured_data);
      } catch (e) {
        row.structured = null;
      }
      return row;
    }

    const legacy = db.prepare(`SELECT * FROM profile WHERE id = 1`).get();
    if (legacy && legacy.data) {
      try {
        legacy.structured = JSON.parse(legacy.data);
      } catch (e) {
        legacy.structured = null;
      }
      return legacy;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------------------------------
// 4. Raw Scraped Sources Staging CRUD
// --------------------------------------------------------------------------
export function insertRawJobSource({ taskId = null, source = "linkedin", sourceUrl, rawContent }) {
  const hash = crypto.createHash("sha256").update(rawContent || "").digest("hex");
  const stmt = db.prepare(`
    INSERT INTO raw_job_sources (task_id, source, source_url, raw_content, content_hash, parsed, collected_at)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
  `);
  const res = stmt.run(taskId, source, sourceUrl, rawContent, hash);
  return { id: res.lastInsertRowid, contentHash: hash };
}

export function getUnparsedRawJobSources(limit = 20) {
  return db.prepare(`SELECT * FROM raw_job_sources WHERE parsed = 0 ORDER BY collected_at ASC LIMIT ?`).all(limit);
}

export function markRawJobSourceParsed(id) {
  db.prepare(`UPDATE raw_job_sources SET parsed = 1 WHERE id = ?`).run(id);
}

// --------------------------------------------------------------------------
// 5. Jobs & 3-Tier Deduplication CRUD
// --------------------------------------------------------------------------
export function findExistingJob({ source = "linkedin", sourceJobId = null, url = null, canonicalUrl = null, contentHash = null }) {
  // Tier 1: Primary check by source + source_job_id
  if (source && sourceJobId) {
    const bySourceId = db.prepare(`SELECT * FROM jobs WHERE source = ? AND source_job_id = ?`).get(source, String(sourceJobId));
    if (bySourceId) return bySourceId;
  }

  // Tier 2: Secondary check by canonical URL / URL
  const searchUrl = canonicalUrl || url;
  if (searchUrl) {
    const cleanUrl = searchUrl.split("?")[0];
    const byUrl = db.prepare(`SELECT * FROM jobs WHERE url = ? OR canonical_url = ? OR url = ? OR canonical_url = ?`).get(
      searchUrl,
      searchUrl,
      cleanUrl,
      cleanUrl
    );
    if (byUrl) return byUrl;
  }

  // Tier 3: Fallback check by content hash
  if (contentHash) {
    const byHash = db.prepare(`SELECT * FROM jobs WHERE content_hash = ?`).get(contentHash);
    if (byHash) return byHash;
  }

  return null;
}

export function upsertNormalizedJob(job) {
  const hash = job.contentHash || computeContentHash(job.title, job.company, job.description);
  const canonicalUrl = (job.canonicalUrl || job.url || "").split("?")[0];

  const existing = findExistingJob({
    source: job.source || "linkedin",
    sourceJobId: job.sourceJobId,
    url: job.url,
    canonicalUrl,
    contentHash: hash,
  });

  if (existing) {
    // Update last_seen_at and refreshed fields
    db.prepare(`
      UPDATE jobs SET
        last_seen_at = datetime('now'),
        updated_at = datetime('now'),
        description = COALESCE(?, description),
        final_url = COALESCE(?, final_url),
        application_url = COALESCE(?, application_url)
      WHERE id = ?
    `).run(job.description || null, job.finalUrl || null, job.applicationUrl || null, existing.id);
    return { id: existing.id, isNew: false };
  }

  const stmt = db.prepare(`
    INSERT INTO jobs (
      source, source_job_id, url, canonical_url, final_url, title, company, location,
      description, employment_type, experience_level, workplace_type, ats, application_url,
      posted_at, content_hash, status, last_seen_at, created_at, updated_at
    ) VALUES (
      @source, @sourceJobId, @url, @canonicalUrl, @finalUrl, @title, @company, @location,
      @description, @employmentType, @experienceLevel, @workplaceType, @ats, @applicationUrl,
      @postedAt, @contentHash, 'active', datetime('now'), datetime('now'), datetime('now')
    )
  `);

  const result = stmt.run({
    source: job.source || "linkedin",
    sourceJobId: job.sourceJobId ? String(job.sourceJobId) : null,
    url: job.url,
    canonicalUrl,
    finalUrl: job.finalUrl || job.url || null,
    title: job.title,
    company: job.company || "Unknown Company",
    location: job.location || "Remote / Hybrid",
    description: job.description || "",
    employmentType: job.employmentType || "fulltime",
    experienceLevel: job.experienceLevel || "entry",
    workplaceType: job.workplaceType || "hybrid",
    ats: job.ats || "direct",
    applicationUrl: job.applicationUrl || null,
    postedAt: job.postedAt || new Date().toISOString(),
    contentHash: hash,
  });

  const newJobId = result.lastInsertRowid;

  // Initialize application record in 'NOT_APPLIED' state
  const appStmt = db.prepare(`
    INSERT INTO applications (job_id, profile_id, status, created_at, updated_at)
    VALUES (?, 1, 'NOT_APPLIED', datetime('now'), datetime('now'))
    ON CONFLICT(job_id) DO NOTHING
  `);
  appStmt.run(newJobId);

  return { id: newJobId, isNew: true };
}

// Legacy upsertJob wrapper for existing alert scanner
export function upsertJob(job) {
  const hash = computeContentHash(job.title, job.company, job.description);
  const stmt = db.prepare(`
    INSERT INTO jobs (
      source, source_job_id, gmail_message_id, title, company, url, final_url,
      description, ats, ats_board, ats_job_id, can_auto_submit, content_hash, received_at, last_seen_at
    ) VALUES (
      @source, @sourceJobId, @gmailMessageId, @title, @company, @url, @finalUrl,
      @description, @ats, @atsBoard, @atsJobId, @canAutoSubmit, @contentHash, @receivedAt, datetime('now')
    )
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title, company = excluded.company, description = excluded.description, last_seen_at = datetime('now')
  `);

  stmt.run({
    source: job.ats === "linkedin_post" ? "linkedin" : "gmail_alert",
    sourceJobId: job.atsJobId || null,
    gmailMessageId: job.gmailMessageId || null,
    title: job.title,
    company: job.company || "Unknown Company",
    url: job.url,
    finalUrl: job.finalUrl || null,
    description: job.description || null,
    ats: job.ats || "unknown",
    atsBoard: job.atsBoard || null,
    atsJobId: job.atsJobId || null,
    canAutoSubmit: job.canAutoSubmit ? 1 : 0,
    contentHash: hash,
    receivedAt: job.receivedAt || new Date().toISOString(),
  });

  const saved = getJobByUrl(job.url);
  if (saved) {
    db.prepare(`
      INSERT INTO applications (job_id, profile_id, status, created_at, updated_at)
      VALUES (?, 1, 'NOT_APPLIED', datetime('now'), datetime('now'))
      ON CONFLICT(job_id) DO NOTHING
    `).run(saved.id);
  }
}

export function listJobs({ status, source } = {}) {
  let query = `
    SELECT 
      j.*,
      COALESCE(jm.score, j.match_score) as match_score,
      COALESCE(jm.reasoning, j.match_reason) as match_reason,
      COALESCE(td.tailored_resume, j.tailored_resume) as tailored_resume,
      COALESCE(td.tailored_cover_letter, j.tailored_cover_letter) as tailored_cover_letter,
      COALESCE(a.status, j.status, 'new') as app_status
    FROM jobs j
    LEFT JOIN job_matches jm ON jm.job_id = j.id AND jm.profile_id = 1
    LEFT JOIN tailored_documents td ON td.job_id = j.id AND td.profile_id = 1
    LEFT JOIN applications a ON a.job_id = j.id
  `;

  const where = [];
  const params = [];

  if (status) {
    where.push(`(j.status = ? OR a.status = ?)`);
    params.push(status, status);
  }

  if (source) {
    if (source === "gmail" || source === "gmail_alert") {
      where.push(`(j.source IN ('gmail_alert', 'superset', 'email'))`);
    } else {
      where.push(`(j.source = ?)`);
      params.push(source);
    }
  }

  if (where.length > 0) {
    query += ` WHERE ${where.join(" AND ")}`;
  }

  query += ` ORDER BY match_score DESC, j.created_at DESC`;
  return db.prepare(query).all(...params);
}

export function getTelemetryFeed(limit = 25) {
  const recentRuns = db.prepare(`SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 15`).all();
  const tasks = db.prepare(`SELECT * FROM hunter_tasks ORDER BY created_at DESC LIMIT 15`).all();
  const rawSources = db.prepare(`
    SELECT id, task_id, source, source_url, content_hash, parsed, collected_at
    FROM raw_job_sources ORDER BY collected_at DESC LIMIT 15
  `).all();

  return {
    runs: recentRuns,
    tasks,
    rawSources,
  };
}

export function getGmailAlertsList(limit = 30) {
  return db.prepare(`
    SELECT j.*, a.status as app_status, COALESCE(jm.score, j.match_score) as match_score
    FROM jobs j
    LEFT JOIN job_matches jm ON jm.job_id = j.id AND jm.profile_id = 1
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE j.source IN ('gmail_alert', 'superset', 'email')
    ORDER BY j.created_at DESC LIMIT ?
  `).all(limit);
}

export function getJob(id) {
  return db.prepare(`
    SELECT 
      j.*,
      COALESCE(jm.score, j.match_score) as match_score,
      COALESCE(jm.reasoning, j.match_reason) as match_reason,
      COALESCE(td.tailored_resume, j.tailored_resume) as tailored_resume,
      COALESCE(td.tailored_cover_letter, j.tailored_cover_letter) as tailored_cover_letter,
      COALESCE(a.status, j.status, 'new') as app_status
    FROM jobs j
    LEFT JOIN job_matches jm ON jm.job_id = j.id AND jm.profile_id = 1
    LEFT JOIN tailored_documents td ON td.job_id = j.id AND td.profile_id = 1
    LEFT JOIN applications a ON a.job_id = j.id
    WHERE j.id = ?
  `).get(id);
}

export function getJobByUrl(url) {
  return db.prepare(`SELECT * FROM jobs WHERE url = ?`).get(url);
}

export function updateJobStatus(id, status, note = null) {
  db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);

  const app = db.prepare(`SELECT * FROM applications WHERE job_id = ?`).get(id);
  const oldStatus = app?.status || "NOT_APPLIED";

  db.prepare(`
    INSERT INTO applications (job_id, profile_id, status, updated_at)
    VALUES (?, 1, ?, datetime('now'))
    ON CONFLICT(job_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).run(id, status);

  const updatedApp = db.prepare(`SELECT * FROM applications WHERE job_id = ?`).get(id);
  if (updatedApp) {
    db.prepare(`
      INSERT INTO application_events (application_id, old_status, new_status, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(updatedApp.id, oldStatus, status, note);
  }
}

export function deleteJob(id) {
  return db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id);
}

export function insertManualJob(job) {
  const hash = computeContentHash(job.title, job.company, job.description);
  const stmt = db.prepare(`
    INSERT INTO jobs (source, title, company, url, final_url, description, ats, match_score, match_reason, status, content_hash, created_at, updated_at)
    VALUES ('direct', @title, @company, @url, @finalUrl, @description, @ats, @matchScore, @matchReason, @status, @contentHash, datetime('now'), datetime('now'))
  `);
  return stmt.run({
    title: job.title,
    company: job.company || "Unknown Company",
    url: job.url || `manual-${Date.now()}`,
    finalUrl: job.finalUrl || job.url || null,
    description: job.description || null,
    ats: job.ats || "direct",
    matchScore: job.matchScore ?? null,
    matchReason: job.matchReason ?? null,
    status: job.status || "active",
    contentHash: hash,
  });
}

// --------------------------------------------------------------------------
// 6. Job Matches CRUD
// --------------------------------------------------------------------------
export function saveJobMatch({
  jobId,
  profileId = 1,
  score,
  matchedSkills = [],
  missingSkills = [],
  experienceMatch = 1,
  educationMatch = 1,
  concerns = [],
  reasoning = "",
  model = "gemini-1.5-flash",
}) {
  const stmt = db.prepare(`
    INSERT INTO job_matches (
      job_id, profile_id, score, matched_skills, missing_skills,
      experience_match, education_match, concerns, reasoning, model, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT(job_id, profile_id) DO UPDATE SET
      score = excluded.score,
      matched_skills = excluded.matched_skills,
      missing_skills = excluded.missing_skills,
      experience_match = excluded.experience_match,
      education_match = excluded.education_match,
      concerns = excluded.concerns,
      reasoning = excluded.reasoning,
      model = excluded.model,
      created_at = excluded.created_at
  `);

  stmt.run(
    jobId,
    profileId,
    score,
    JSON.stringify(matchedSkills || []),
    JSON.stringify(missingSkills || []),
    experienceMatch ? 1 : 0,
    educationMatch ? 1 : 0,
    JSON.stringify(concerns || []),
    reasoning || "",
    model || "gemini"
  );

  db.prepare(`UPDATE jobs SET match_score = ?, match_reason = ? WHERE id = ?`).run(score, reasoning, jobId);
}

export function getJobMatch(jobId, profileId = 1) {
  const row = db.prepare(`SELECT * FROM job_matches WHERE job_id = ? AND profile_id = ?`).get(jobId, profileId);
  if (!row) return null;
  return {
    ...row,
    matchedSkills: JSON.parse(row.matched_skills || "[]"),
    missingSkills: JSON.parse(row.missing_skills || "[]"),
    concerns: JSON.parse(row.concerns || "[]"),
    experienceMatch: Boolean(row.experience_match),
    educationMatch: Boolean(row.education_match),
  };
}

export function updateJobMatch(id, { score, reason }) {
  saveJobMatch({ jobId: id, score, reasoning: reason });
}

// --------------------------------------------------------------------------
// 7. Tailored Documents CRUD
// --------------------------------------------------------------------------
export function saveTailoredDocument({
  jobId,
  profileId = 1,
  tailoredResume,
  tailoredCoverLetter = "",
  aiProvider = "gemini",
  model = "gemini-1.5-flash",
}) {
  const existing = db.prepare(`SELECT MAX(version) as max_v FROM tailored_documents WHERE job_id = ?`).get(jobId);
  const nextVersion = (existing?.max_v || 0) + 1;

  db.prepare(`
    INSERT INTO tailored_documents (
      job_id, profile_id, version, tailored_resume, tailored_cover_letter, ai_provider, model, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `).run(jobId, profileId, nextVersion, tailoredResume, tailoredCoverLetter, aiProvider, model);

  db.prepare(`
    UPDATE jobs SET tailored_resume = ?, tailored_cover_letter = ?, status = 'tailored' WHERE id = ?
  `).run(tailoredResume, tailoredCoverLetter, jobId);

  updateJobStatus(jobId, "READY", "Tailored documents generated");
}

export function getTailoredDocument(jobId, profileId = 1) {
  return db.prepare(`
    SELECT * FROM tailored_documents WHERE job_id = ? AND profile_id = ? ORDER BY version DESC LIMIT 1
  `).get(jobId, profileId);
}

export function updateJobTailoring(id, { resumeBullets, coverLetter, provider }) {
  saveTailoredDocument({
    jobId: id,
    tailoredResume: resumeBullets,
    tailoredCoverLetter: coverLetter,
    aiProvider: provider || "gemini",
  });
}

// --------------------------------------------------------------------------
// 8. Application History & Events CRUD
// --------------------------------------------------------------------------
export function recordApplicationEvent(jobId, { oldStatus, newStatus, note = "" }) {
  const app = db.prepare(`SELECT id FROM applications WHERE job_id = ?`).get(jobId);
  if (app) {
    db.prepare(`
      INSERT INTO application_events (application_id, old_status, new_status, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(app.id, oldStatus, newStatus, note);
  }
}

export function getApplicationEvents(jobId) {
  const app = db.prepare(`SELECT id FROM applications WHERE job_id = ?`).get(jobId);
  if (!app) return [];
  return db.prepare(`SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at ASC`).all(app.id);
}

// --------------------------------------------------------------------------
// 9. Explicit Task Queue (hunter_tasks) CRUD with Atomic Locking
// --------------------------------------------------------------------------
export function insertHunterTask({ searchId = null, taskType = "job_search", query, searchUrl = null, scheduledAt = null }) {
  const schedTime = scheduledAt || new Date().toISOString();
  
  const existing = db.prepare(`
    SELECT * FROM hunter_tasks WHERE query = ? AND status IN ('PENDING', 'RUNNING')
  `).get(query);

  if (existing) return existing.id;

  const result = db.prepare(`
    INSERT INTO hunter_tasks (search_id, task_type, query, search_url, status, scheduled_at, created_at)
    VALUES (?, ?, ?, ?, 'PENDING', ?, datetime('now'))
  `).run(searchId, taskType, query, searchUrl, schedTime);

  return result.lastInsertRowid;
}

export function getPendingTasks(limit = 10) {
  return db.prepare(`
    SELECT * FROM hunter_tasks
    WHERE status = 'PENDING' AND datetime(scheduled_at) <= datetime('now')
    ORDER BY scheduled_at ASC LIMIT ?
  `).all(limit);
}

export function lockNextHunterTask(workerId = "local-worker-1") {
  const task = db.prepare(`
    SELECT * FROM hunter_tasks
    WHERE status = 'PENDING' AND datetime(scheduled_at) <= datetime('now')
    ORDER BY scheduled_at ASC LIMIT 1
  `).get();

  if (!task) return null;

  const res = db.prepare(`
    UPDATE hunter_tasks
    SET status = 'RUNNING', locked_at = datetime('now'), worker_id = ?, attempts = attempts + 1
    WHERE id = ? AND status = 'PENDING'
  `).run(workerId, task.id);

  if (res.changes > 0) {
    return { ...task, status: "RUNNING", worker_id: workerId, attempts: task.attempts + 1 };
  }

  return null;
}

export function completeHunterTask(taskId) {
  db.prepare(`
    UPDATE hunter_tasks
    SET status = 'COMPLETED', completed_at = datetime('now'), locked_at = NULL
    WHERE id = ?
  `).run(taskId);
}

export function failHunterTask(taskId, errorMessage) {
  db.prepare(`
    UPDATE hunter_tasks
    SET status = 'FAILED', error_message = ?, locked_at = NULL
    WHERE id = ?
  `).run(errorMessage, taskId);
}

export function pauseHunterTask(taskId, reason) {
  db.prepare(`
    UPDATE hunter_tasks
    SET status = 'PAUSED', error_message = ?, locked_at = NULL
    WHERE id = ?
  `).run(reason, taskId);
}

export function listHunterTasks(limit = 30) {
  return db.prepare(`SELECT * FROM hunter_tasks ORDER BY created_at DESC LIMIT ?`).all(limit);
}

// --------------------------------------------------------------------------
// 10. Agent Runs & Observability Telemetry
// --------------------------------------------------------------------------
export function startAgentRun(agentName) {
  const result = db.prepare(`
    INSERT INTO agent_runs (agent_name, status, items_processed, started_at)
    VALUES (?, 'STARTED', 0, datetime('now'))
  `).run(agentName);
  return result.lastInsertRowid;
}

export function finishAgentRun(runId, { status = "SUCCESS", itemsProcessed = 0, errorDetails = null } = {}) {
  db.prepare(`
    UPDATE agent_runs
    SET status = ?, items_processed = ?, finished_at = datetime('now'), error_details = ?
    WHERE id = ?
  `).run(status, itemsProcessed, errorDetails, runId);
}

export function listAgentRuns(limit = 20) {
  return db.prepare(`SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT ?`).all(limit);
}

// --------------------------------------------------------------------------
// 11. Workspace Settings & Users
// --------------------------------------------------------------------------
export function saveSetting(key, value) {
  const valStr = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, valStr);
}

export function getSetting(key, defaultValue = null) {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  } catch {
    return defaultValue;
  }
}

export function getAllSettings() {
  try {
    const rows = db.prepare(`SELECT key, value FROM settings`).all();
    const result = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveUser(email, passwordHash, name) {
  return db.prepare(
    `INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, name = excluded.name`
  ).run(email, passwordHash, name);
}

export function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

export default db;
