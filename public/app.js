const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const defaultMasterProfile = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    leetcode: "",
    portfolio: "",
  },
  summary: "",
  skills: {
    programming: [],
    frontend: [],
    backend: [],
    databases: [],
    ai_ml: [],
    tools: [],
  },
  education: [],
  experience: [],
  projects: [],
  certifications: [],
  achievements: [],
  jobPreferences: {
    targetRoles: [
      "Software Engineer",
      "Full Stack Developer",
      "Frontend Developer",
      "Backend Developer",
    ],
    preferredLocations: ["Bengaluru", "Remote", "Hybrid"],
    workMode: { remote: true, hybrid: true, onsite: false },
    employmentType: { fulltime: true, internship: true, contract: false },
    experienceLevel: "Entry Level",
    salaryMin: "",
    salaryMax: "",
    currency: "INR",
    noticePeriod: "Immediate",
    willingToRelocate: "Yes",
  },
  applicationProfile: {
    workAuthorization: "Authorized to work",
    sponsorshipRequired: "No",
    willingToRelocate: "Yes",
    totalExperience: "0–1 Years",
    noticePeriod: "Immediate",
    expectedSalary: "",
    customNotes: "",
  },
  tailoringRules: {
    neverFabricateExperience: true,
    neverFabricateSkills: true,
    neverChangeDates: true,
    neverChangeEducation: true,
    onlyMasterProfile: true,
    style: "Balanced",
  },
  masterResumeFile: {
    fileName: "",
    uploadedDate: "",
    fileSize: "",
    status: "No File Uploaded",
  },
};

const state = {
  connected: false,
  authenticated: false,
  userMenuOpen: false,
  searchQuery: "",
  filter: "all",
  profile: null,
  masterProfile: JSON.parse(JSON.stringify(defaultMasterProfile)),
  profileSubTab: "master", // 'master' | 'preferences' | 'application_profile' | 'tailoring_rules' | 'master_resume' | 'upload'
  splitViewActive: true,
  previewMode: "pdf", // 'pdf' | 'text'
  resumeRawText: "",
  jobs: [],
  activeView: "jobs", // 'jobs' | 'applications' | 'studio' | 'profile' | 'analytics' | 'settings'
  drawerOpen: false,
  user: {
    name: "",
    email: "",
    role: "",
    avatar: "U",
    picture: null,
  },
};

const viewTitles = {
  jobs: "Unified Opportunities Hub",
  hunter: "Autonomous LinkedIn Hunter & Live Telemetry",
  gmail: "Gmail & Superset Alert Ingestion",
  applications: "Applications Pipeline",
  studio: "Resume Studio · Tailored Documents",
  profile: "Profile & Documents · Master Profile System",
  settings: "Workspace Settings",
};

const els = {
  body: document.body,
  appRoot: $("#app-root"),
  pageTitle: $("#page-title"),
  modelChip: $("#model-chip"),
  modelText: $("#model-text"),
  scanBtn: $("#scan-btn"),
  modal: $("#job-modal"),
  modalBody: $("#modal-body"),
  modalClose: $("#modal-close"),
  userMenuWrap: $("#user-menu-wrap"),
  userMenuBtn: $("#user-menu-btn"),
  userDropdown: $("#user-dropdown"),
  userDisplayName: $("#user-display-name"),
  userDisplayEmail: $("#user-display-email"),
  userAvatarSm: $("#user-avatar-sm"),
  userAvatarMd: $("#user-avatar-md"),
  userAvatarRail: $("#user-avatar-rail"),
  headerSearchInput: $("#header-search-input"),
  toastContainer: $("#toast-container"),
};

function showToast(message, icon = "check_circle") {
  if (!els.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px; color:var(--secondary);">${icon}</span><span>${escapeHtml(
    message
  )}</span>`;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function compileMasterProfileToText(mp) {
  const p = mp || state.masterProfile;
  const pi = p.personalInfo || {};
  let text = `${pi.fullName || "Candidate"}\n${pi.email || ""} | ${pi.phone || ""} | ${pi.location || ""}\n`;
  if (pi.linkedin || pi.github) {
    text += `LinkedIn: ${pi.linkedin || "N/A"} | GitHub: ${pi.github || "N/A"}\n`;
  }
  if (pi.portfolio) {
    text += `Portfolio: ${pi.portfolio}\n`;
  }
  text += `\nSUMMARY\n${p.summary || ""}\n\nSKILLS\n`;
  if (p.skills) {
    for (const [cat, list] of Object.entries(p.skills)) {
      if (Array.isArray(list) && list.length) {
        text += `- ${cat.toUpperCase()}: ${list.join(", ")}\n`;
      }
    }
  }
  text += `\nEDUCATION\n`;
  if (Array.isArray(p.education)) {
    p.education.forEach((e) => {
      text += `- ${e.degree} | ${e.institution} (${e.startDate} - ${e.endDate}) ${e.grade ? `[${e.grade}]` : ""}\n`;
      if (e.coursework) text += `  Coursework: ${e.coursework}\n`;
    });
  }
  text += `\nEXPERIENCE\n`;
  if (Array.isArray(p.experience)) {
    p.experience.forEach((exp) => {
      text += `- ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.endDate})\n`;
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach((b) => (text += `  • ${b}\n`));
      }
    });
  }
  text += `\nPROJECTS\n`;
  if (Array.isArray(p.projects)) {
    p.projects.forEach((proj) => {
      text += `- ${proj.name}: ${proj.description} [Tech: ${proj.technologies}]\n`;
      if (proj.keyContributions) text += `  Contributions: ${proj.keyContributions}\n`;
      if (proj.githubUrl) text += `  GitHub: ${proj.githubUrl}\n`;
      if (proj.liveDemoUrl) text += `  Live Demo: ${proj.liveDemoUrl}\n`;
    });
  }
  text += `\nCERTIFICATIONS & ACHIEVEMENTS\n`;
  if (Array.isArray(p.certifications)) {
    p.certifications.forEach((c) => (text += `- ${c.name} (${c.issuer}, ${c.issueDate})\n`));
  }
  if (Array.isArray(p.achievements)) {
    p.achievements.forEach((a) => (text += `- ${a.title}: ${a.description} (${a.date})\n`));
  }
  return text;
}

function initialsFromJob(job) {
  const source = job.company || job.title || "JT";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function initialsFromProfile(name) {
  if (!name) return "BS";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function profileName() {
  return state.masterProfile.personalInfo?.fullName || state.user.name || "User";
}

function profileEmail() {
  return state.masterProfile.personalInfo?.email || state.user.email || "";
}

function renderProfileAvatar() {
  if (state.user.picture) {
    return `<img src="${escapeHtml(state.user.picture)}" alt="${escapeHtml(profileName())}" referrerpolicy="no-referrer" />`;
  }
  return escapeHtml(initialsFromProfile(profileName()));
}

function scoreTone(score) {
  if (score == null) return "low";
  if (score >= 80) return "good";
  if (score >= 50) return "mid";
  return "low";
}

function scoreLabel(job) {
  if (job.match_score == null) return "—";
  return `${job.match_score}%`;
}

function scoreRing(job) {
  const score = Math.max(0, Math.min(100, Number(job.match_score ?? 0)));
  const dashOffset = 100 - score;
  const tone = scoreTone(job.match_score);

  return `
    <div class="score-ring score-ring--${tone}" aria-label="Match score ${score}%">
      <svg viewBox="0 0 36 36" role="img" aria-hidden="true">
        <path class="score-ring__bg" fill="none" stroke-width="3.2" d="M18 2.08a15.92 15.92 0 1 1 0 31.84a15.92 15.92 0 1 1 0 -31.84"></path>
        <path class="score-ring__fg" fill="none" stroke-width="3.2" stroke-dasharray="100 100" stroke-dashoffset="${dashOffset}" d="M18 2.08a15.92 15.92 0 1 1 0 31.84a15.92 15.92 0 1 1 0 -31.84"></path>
      </svg>
      <span class="score-ring__label">${job.match_score != null ? `${score}` : "—"}</span>
    </div>
  `;
}

function extractTechChips(job) {
  const text = `${job.title} ${job.description} ${job.company}`.toLowerCase();
  const techKeywords = [
    "React", "TypeScript", "Node.js", "JavaScript", "Python", "Java", "PostgreSQL",
    "Tailwind", "Next.js", "MongoDB", "FastAPI", "AWS", "Docker", "SQL"
  ];
  const matched = techKeywords.filter((k) => text.includes(k.toLowerCase())).slice(0, 3);
  if (matched.length === 0) {
    if (job.ats) matched.push(job.ats.toUpperCase());
    else matched.push("Full Stack");
  }
  return matched;
}

function deriveStats(jobs) {
  const total = jobs.length;
  const linkedin = jobs.filter((job) => job.source === "linkedin").length;
  const gmail = jobs.filter((job) => job.source === "gmail_alert" || job.source === "superset" || job.source === "email").length;
  const highFit = jobs.filter((job) => Number(job.match_score || 0) >= 80).length;
  const tailored = jobs.filter(
    (job) => job.status === "tailored" || job.status === "applied" || job.status === "interviewing"
  ).length;
  const applied = jobs.filter(
    (job) => job.status === "applied" || job.status === "interviewing" || job.status === "offer"
  ).length;
  const scored = jobs.filter((job) => job.match_score != null);
  const average = scored.length
    ? Math.round(scored.reduce((sum, job) => sum + Number(job.match_score || 0), 0) / scored.length)
    : 0;

  return { total, linkedin, gmail, highFit, tailored, applied, average };
}

function getFilteredJobs() {
  let filtered = [...state.jobs];

  if (state.filter === "linkedin") {
    filtered = filtered.filter((job) => job.source === "linkedin");
  } else if (state.filter === "gmail") {
    filtered = filtered.filter((job) => job.source === "gmail_alert" || job.source === "superset" || job.source === "email");
  } else if (state.filter === "high") {
    filtered = filtered.filter((job) => Number(job.match_score || 0) >= 80);
  } else if (state.filter === "tailored") {
    filtered = filtered.filter((job) => job.status === "tailored");
  } else if (state.filter === "applied") {
    filtered = filtered.filter((job) => job.status === "applied");
  } else if (state.filter === "interviewing") {
    filtered = filtered.filter((job) => job.status === "interviewing");
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (job) =>
        (job.title && job.title.toLowerCase().includes(q)) ||
        (job.company && job.company.toLowerCase().includes(q)) ||
        (job.description && job.description.toLowerCase().includes(q)) ||
        (job.ats && job.ats.toLowerCase().includes(q))
    );
  }

  return filtered;
}

function toggleUserMenu() {
  if (!els.userDropdown) return;
  state.userMenuOpen = !state.userMenuOpen;
  els.userDropdown.classList.toggle("hidden", !state.userMenuOpen);
}

function closeUserMenu() {
  state.userMenuOpen = false;
  if (els.userDropdown) els.userDropdown.classList.add("hidden");
}

async function logout() {
  state.authenticated = false;
  state.connected = false;
  closeUserMenu();
  closeModal();

  try {
    await fetch("/auth/logout", { method: "POST" });
  } catch (e) {}

  render();
}

async function refreshAll({ renderAfter = true } = {}) {
  try {
    const res = await fetch("/auth/status");
    const data = await res.json();
    if (data.connected && data.profile) {
      state.connected = true;
      state.authenticated = true;
      state.user.email = data.profile.email || "";
      state.user.name = data.profile.name || data.profile.email || "User";
      state.user.picture = data.profile.picture || null;
      state.user.avatar = initialsFromProfile(state.user.name);
    } else {
      state.connected = Boolean(data.connected);
      state.authenticated = Boolean(data.connected);
    }
  } catch (e) {
    state.connected = false;
    state.authenticated = false;
  }

  if (state.authenticated) {
    await Promise.all([loadProfile(), loadJobs(), fetchSettings()]);
  } else {
    await fetchSettings();
  }

  if (renderAfter) {
    render();
  }
}

async function fetchSettings() {
  try {
    const res = await fetch("/api/settings");
    const settings = await res.json();
    state.settings = settings || {};
  } catch (e) {
    state.settings = {};
  }
}

async function loadProfile() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();
    state.profile = data || null;
    if (data && (data.resumeText || data.resume_text)) {
      state.resumeRawText = data.resumeText || data.resume_text;
    }
    if (data && data.structured) {
      const s = data.structured;
      state.masterProfile = {
        ...defaultMasterProfile,
        ...s,
        personalInfo: { ...defaultMasterProfile.personalInfo, ...(s.personalInfo || {}) },
        skills: { ...defaultMasterProfile.skills, ...(s.skills || {}) },
        education: Array.isArray(s.education) && s.education.length ? s.education : defaultMasterProfile.education,
        experience: Array.isArray(s.experience) ? s.experience : [],
        projects: Array.isArray(s.projects) && s.projects.length ? s.projects : defaultMasterProfile.projects,
        certifications: Array.isArray(s.certifications) && s.certifications.length ? s.certifications : defaultMasterProfile.certifications,
        jobPreferences: { ...defaultMasterProfile.jobPreferences, ...(s.jobPreferences || {}) },
        applicationProfile: { ...defaultMasterProfile.applicationProfile, ...(s.applicationProfile || {}) },
        tailoringRules: { ...defaultMasterProfile.tailoringRules, ...(s.tailoringRules || {}) },
        masterResumeFile: { ...defaultMasterProfile.masterResumeFile, ...(s.masterResumeFile || {}) },
      };
    }
  } catch (e) {
    state.profile = null;
  }
}

async function loadJobs() {
  try {
    const res = await fetch("/api/jobs");
    const jobs = await res.json();
    state.jobs = Array.isArray(jobs) ? jobs : [];
  } catch (e) {
    state.jobs = [];
  }
}

/* ==========================================================================
   VIEW BUILDERS
   ========================================================================== */

/* Login View */
function buildLoginView() {
  return `
    <section style="display:flex; justify-content:center; align-items:center; min-height:85vh; padding:20px;">
      <div class="glass-card" style="max-width:480px; width:100%; padding:36px 32px; border-radius:16px; text-align:center;">
        <div style="width:52px; height:52px; margin:0 auto 16px; border-radius:12px; background:var(--primary-deep); display:grid; place-items:center; color:#fff; box-shadow:0 0 20px var(--primary-glow);">
          <span class="material-symbols-outlined" style="font-size:28px; font-variation-settings:'FILL' 1;">hub</span>
        </div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:8px; letter-spacing:-0.02em;">Sign in to JobHQ</h1>
        <p style="font-size:13px; color:var(--text-dim); margin-bottom:28px; line-height:1.5;">
          Connect your Google account to automatically scan LinkedIn job alert emails from Gmail and enable AI Master Profile tailoring.
        </p>

        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:28px; text-align:left;">
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--surface-container); border-radius:8px; border:1px solid var(--border);">
            <span class="material-symbols-outlined" style="color:var(--secondary); font-size:20px;">verified_user</span>
            <div>
              <div style="font-size:13px; font-weight:600;">Google Identity Single Sign-On</div>
              <div style="font-size:11px; color:var(--text-dim);">Secure authentication via Google OAuth2</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--surface-container); border-radius:8px; border:1px solid var(--border);">
            <span class="material-symbols-outlined" style="color:var(--primary); font-size:20px;">mark_email_unread</span>
            <div>
              <div style="font-size:13px; font-weight:600;">Automated Gmail Ingestion</div>
              <div style="font-size:11px; color:var(--text-dim);">Real-time parsing of saved LinkedIn search alerts</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px; background:var(--surface-container); border-radius:8px; border:1px solid var(--border);">
            <span class="material-symbols-outlined" style="color:var(--tertiary); font-size:20px;">auto_awesome</span>
            <div>
              <div style="font-size:13px; font-weight:600;">Strict Master Profile AI Tailoring</div>
              <div style="font-size:11px; color:var(--text-dim);">Never fabricates experience; uses only real credentials</div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" data-action="connect-gmail" style="width:100%; padding:12px; font-size:14px; display:flex; align-items:center; justify-content:center; gap:10px;">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Sign in with Google Account</span>
        </button>
      </div>
    </section>
  `;
}

/* 1. Jobs Dashboard View */
function buildJobsView() {
  const stats = deriveStats(state.jobs);
  const filteredJobs = getFilteredJobs();

  return `
    <section class="page dashboard">
      <div class="activity-banner">
        <div class="activity-left">
          <div class="activity-icon-box">
            <span class="material-symbols-outlined">radar</span>
          </div>
          <div>
            <div class="activity-title">JobHQ Autonomous Command Center</div>
            <div class="activity-sub">
              <span>Self-Hosted Local Browser Hunter Active</span>
              <span class="activity-dot"></span>
              <span>${stats.total} opportunities tracked</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-secondary btn--compact" data-action="scan" style="display:inline-flex; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;">sync</span>
            <span>Sync Alerts</span>
          </button>
          <button class="btn btn-primary btn--compact" data-action="run-hunter-once" style="display:inline-flex; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;">explore</span>
            <span>Run Job Hunter</span>
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Total Tracked Roles</div>
          <div class="stat-value">${stats.total}</div>
          <div class="stat-note">Opportunities tracked in database.</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">High Fit (≥80%)</div>
          <div class="stat-value" style="color:var(--secondary);">${stats.highFit}</div>
          <div class="stat-note">Roles matching your Master Profile.</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Resumes Tailored</div>
          <div class="stat-value" style="color:var(--primary);">${stats.tailored}</div>
          <div class="stat-note">Available in Resume Studio.</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Applications Sent</div>
          <div class="stat-value" style="color:var(--tertiary);">${stats.applied}</div>
          <div class="stat-note">Tracked through submission.</div>
        </article>
      </div>

      <div class="dashboard-filter-bar">
        <div class="filter-pills">
          <button class="filter-pill ${state.filter === "all" ? "active" : ""}" data-filter="all">All (${stats.total})</button>
          <button class="filter-pill ${state.filter === "linkedin" ? "active" : ""}" data-filter="linkedin">⚡ LinkedIn (${stats.linkedin})</button>
          <button class="filter-pill ${state.filter === "gmail" ? "active" : ""}" data-filter="gmail">✉️ Gmail &amp; Superset (${stats.gmail})</button>
          <button class="filter-pill ${state.filter === "high" ? "active" : ""}" data-filter="high">High Fit ≥80% (${stats.highFit})</button>
          <button class="filter-pill ${state.filter === "tailored" ? "active" : ""}" data-filter="tailored">Tailored (${stats.tailored})</button>
          <button class="filter-pill ${state.filter === "applied" ? "active" : ""}" data-filter="applied">Applied (${stats.applied})</button>
        </div>

        <div class="filter-actions">
          <button class="btn btn-secondary btn--compact" data-action="scan" style="display:inline-flex; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;">sync</span>
            <span>Sync Alerts</span>
          </button>
          <button class="btn btn-secondary btn--compact" data-action="load-sample-jobs" style="display:inline-flex; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;">dataset</span>
            <span>Seed Roles</span>
          </button>
        </div>
      </div>

      <div class="job-grid">
        ${
          filteredJobs.length
            ? filteredJobs
                .map((job) => {
                  const techChips = extractTechChips(job);
                  return `
                  <article class="job-card" data-job-id="${job.id}">
                    <div class="job-card__top">
                      <div class="job-card__identity">
                        <div class="job-avatar">${escapeHtml(initialsFromJob(job))}</div>
                        <div style="min-width: 0;">
                          <h3 class="job-title" title="${escapeHtml(job.title || "Untitled Role")}">${escapeHtml(job.title || "Untitled Role")}</h3>
                          <div class="job-meta">
                            <span>${escapeHtml(job.company || "Company")}</span>
                            <span>•</span>
                            <span>${job.ats === "linkedin_post" ? '<span style="color:var(--primary); font-weight:600;">LinkedIn Hiring Post</span>' : escapeHtml(job.ats || "Direct")}</span>
                          </div>
                        </div>
                      </div>
                      ${scoreRing(job)}
                    </div>

                    <div class="chips">
                      <span class="chip ${job.status === "applied" ? "chip--secondary" : job.status === "tailored" ? "chip--primary" : "chip--muted"}">${escapeHtml(job.status || "new")}</span>
                      ${techChips.map((t) => `<span class="chip chip--muted">${escapeHtml(t)}</span>`).join("")}
                    </div>

                    <p style="font-size:12px; color:var(--text-dim); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                      ${escapeHtml(job.match_reason || job.description || "Extracted job opportunity.")}
                    </p>

                    <div class="job-actions">
                      <button class="btn btn-primary btn--compact" data-action="tailor-job" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span>
                        Tailor
                      </button>
                      <button class="btn btn-secondary btn--compact" data-action="apply-info" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
                        Review
                      </button>
                      <button class="btn btn-secondary btn--compact" data-action="delete-job" data-id="${job.id}" title="Remove role" style="margin-left:auto; padding:6px 8px; color:var(--text-dim);">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
                      </button>
                    </div>
                  </article>
                `;
                })
                .join("")
            : `
              <div class="glass-card" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
                <span class="material-symbols-outlined" style="font-size: 44px; color: var(--text-dim); margin-bottom: 12px;">search_off</span>
                <h3 style="font-size:16px; font-weight:600; margin-bottom:6px;">No matching roles found</h3>
                <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">Click Seed Sample Roles to populate realistic target roles.</p>
                <button class="btn btn-primary btn--compact" data-action="load-sample-jobs">
                  <span class="material-symbols-outlined" style="font-size:16px;">add</span>
                  Seed Sample Roles
                </button>
              </div>
            `
        }
      </div>
    </section>
  `;
}

/* 2. Autonomous LinkedIn Hunter & Live Telemetry View */
function buildHunterView() {
  const linkedinJobs = state.jobs.filter((j) => j.source === "linkedin");
  const s = state.settings || {};

  return `
    <section class="page hunter-view">
      <div class="activity-banner" style="border-color: rgba(168, 85, 247, 0.4); background: radial-gradient(circle at top left, rgba(168, 85, 247, 0.12), transparent 70%), var(--surface-card);">
        <div class="activity-left">
          <div class="activity-icon-box" style="background: rgba(168, 85, 247, 0.2); border-color: var(--primary);">
            <span class="material-symbols-outlined" style="color: var(--primary);">explore</span>
          </div>
          <div>
            <div class="activity-title">Autonomous LinkedIn Hunter &amp; Live Telemetry</div>
            <div class="activity-sub">
              <span>Scout &rarr; Task Queue &rarr; Background Browser Scraper &rarr; AI Matcher</span>
              <span class="activity-dot"></span>
              <span>${linkedinJobs.length} LinkedIn roles discovered</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn--compact" data-action="run-hunter-once" style="display:inline-flex; gap:6px;">
            <span class="material-symbols-outlined" style="font-size:16px;">play_arrow</span>
            <span>Run Job Hunter Now</span>
          </button>
        </div>
      </div>

      <!-- Live Telemetry Stream / Console Monitor -->
      <div class="glass-card" style="margin-bottom: 20px; border-color: rgba(168, 85, 247, 0.3);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-outlined" style="font-size:16px;">terminal</span>
            <span>Live Worker Telemetry Stream</span>
          </div>
          <span class="chip chip--secondary" style="font-size:11px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#22c55e; margin-right:4px;"></span>
            Scraper Engine Idle &amp; Ready
          </span>
        </div>
        
        <div style="background:#09090b; border:1px solid var(--border); border-radius:8px; padding:14px; font-family:'Geist Mono', monospace; font-size:12px; line-height:1.7; color:#a1a1aa; max-height:220px; overflow-y:auto;">
          <div style="color:#22c55e;">[INFO] Autonomous Hunter initialized (Single-machine local worker).</div>
          <div>[SCOUT] Target role focus: <span style="color:#e4e4e7;">${escapeHtml(s.employmentType === "internship" ? "Software Engineer Intern (Priority)" : "Full-Time Roles")}</span> in <span style="color:#e4e4e7;">${escapeHtml(s.targetLocation || "Bengaluru / India")}</span></div>
          <div>[COLLECTOR] Public job directory scraping active (Zero credential risk).</div>
          <div>[EXTRACTOR] 3-tier deduplicator active (Source ID &rarr; Canonical URL &rarr; SHA-256 Content Hash).</div>
          <div>[MATCHER] AI fit threshold configured (&ge;85% auto-tailors resume bullets).</div>
          <div style="color:#a855f7;">[READY] Click "Run Job Hunter Now" to execute autonomous cycle.</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px;">
        <div>
          <h3>Discovered LinkedIn Roles (${linkedinJobs.length})</h3>
          <p>Roles extracted by the autonomous browser engine matching your profile.</p>
        </div>
      </div>

      <div class="job-grid">
        ${
          linkedinJobs.length
            ? linkedinJobs
                .map((job) => {
                  const techChips = extractTechChips(job);
                  return `
                  <article class="job-card" data-job-id="${job.id}">
                    <div class="job-card__top">
                      <div class="job-card__identity">
                        <div class="job-avatar">${escapeHtml(initialsFromJob(job))}</div>
                        <div>
                          <h3 class="job-title">${escapeHtml(job.title)}</h3>
                          <p class="job-company">${escapeHtml(job.company)} · <span style="color:var(--text-dim);">${escapeHtml(job.location || "Remote / Hybrid")}</span></p>
                        </div>
                      </div>
                      <span class="chip ${scoreTone(job.match_score) === "good" ? "chip--secondary" : "chip--muted"}">
                        ${job.match_score == null ? "Not scored" : `${job.match_score}% match`}
                      </span>
                    </div>

                    <p class="job-card__desc">${escapeHtml((job.description || "No description preview").slice(0, 160))}...</p>

                    <div class="chip-list">
                      <span class="chip chip--primary" style="font-size:10px;">${escapeHtml(job.employment_type || "Full-time")}</span>
                      ${techChips.slice(0, 3).map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}
                    </div>

                    <div class="job-card__actions">
                      <button class="btn btn-secondary btn--compact" data-action="tailor-job" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span>
                        <span>Tailor Resume</span>
                      </button>
                      <button class="btn btn-primary btn--compact" data-action="apply-info" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:14px;">assignment_turned_in</span>
                        <span>Review &amp; Apply</span>
                      </button>
                    </div>
                  </article>
                `;
                })
                .join("")
            : `
            <div class="glass-card" style="grid-column:1 / -1; padding:48px; text-align:center;">
              <span class="material-symbols-outlined" style="font-size:48px; color:var(--primary); margin-bottom:12px;">explore</span>
              <h3 style="font-size:16px; margin-bottom:6px;">No LinkedIn roles discovered yet</h3>
              <p style="font-size:13px; color:var(--text-dim); margin-bottom:20px;">Click below to launch the autonomous Scout and Collector engine.</p>
              <button class="btn btn-primary btn--compact" data-action="run-hunter-once">Launch Job Hunter</button>
            </div>
          `
        }
      </div>
    </section>
  `;
}

/* 3. Gmail & Superset Alert Ingestion View */
function buildGmailAlertsView() {
  const gmailJobs = state.jobs.filter((j) => j.source === "gmail_alert" || j.source === "superset" || j.source === "email");

  return `
    <section class="page gmail-view">
      <div class="activity-banner" style="border-color: rgba(59, 130, 246, 0.4); background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 70%), var(--surface-card);">
        <div class="activity-left">
          <div class="activity-icon-box" style="background: rgba(59, 130, 246, 0.2); border-color: #3b82f6;">
            <span class="material-symbols-outlined" style="color: #3b82f6;">mail</span>
          </div>
          <div>
            <div class="activity-title">Gmail &amp; Superset Email Alert Ingestion</div>
            <div class="activity-sub">
              <span>Automatic parsing of LinkedIn search alert emails &amp; Superset placement notifications</span>
              <span class="activity-dot"></span>
              <span>${gmailJobs.length} email alerts ingested</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn--compact" data-action="scan" style="display:inline-flex; gap:6px; background:#3b82f6; border-color:#3b82f6;">
            <span class="material-symbols-outlined" style="font-size:16px;">sync</span>
            <span>Sync Gmail Alerts</span>
          </button>
        </div>
      </div>

      <!-- Google SSO & Query Filter Status Card -->
      <div class="glass-card" style="margin-bottom:20px; border-color:rgba(59, 130, 246, 0.25);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:#3b82f6; margin-bottom:4px;">
              Connected Google Inbox
            </div>
            <div style="font-size:14px; font-weight:600;">
              ${escapeHtml(profileName())} <span style="font-size:12px; color:var(--text-dim); font-weight:normal;">(${escapeHtml(profileEmail())})</span>
            </div>
            <div style="font-size:12px; color:var(--text-dim); margin-top:6px;">
              Scanning query: <code>from:(jobs-noreply@linkedin.com OR joinsuperset.com OR superset) newer_than:30d</code>
            </div>
          </div>
          <span class="chip chip--secondary" style="background:rgba(34,197,94,0.15); color:#22c55e; border-color:rgba(34,197,94,0.3);">
            Google SSO Connected
          </span>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px;">
        <div>
          <h3>Ingested Alert Postings (${gmailJobs.length})</h3>
          <p>Direct opportunities extracted from your email notification stream.</p>
        </div>
      </div>

      <div class="job-grid">
        ${
          gmailJobs.length
            ? gmailJobs
                .map((job) => {
                  const techChips = extractTechChips(job);
                  const isSuperset = job.source === "superset";
                  return `
                  <article class="job-card" data-job-id="${job.id}">
                    <div class="job-card__top">
                      <div class="job-card__identity">
                        <div class="job-avatar" style="background:${isSuperset ? "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.3))" : "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.3))"}; border-color:${isSuperset ? "#f97316" : "#3b82f6"};">
                          <span class="material-symbols-outlined" style="font-size:16px; color:${isSuperset ? "#f97316" : "#3b82f6"};">${isSuperset ? "school" : "mail"}</span>
                        </div>
                        <div>
                          <h3 class="job-title">${escapeHtml(job.title)}</h3>
                          <p class="job-company">${escapeHtml(job.company)} · <span style="color:var(--text-dim);">${escapeHtml(job.location || "Remote / Campus")}</span></p>
                        </div>
                      </div>
                      <span class="chip ${scoreTone(job.match_score) === "good" ? "chip--secondary" : "chip--muted"}">
                        ${job.match_score == null ? "Not scored" : `${job.match_score}% match`}
                      </span>
                    </div>

                    <p class="job-card__desc">${escapeHtml((job.description || "Parsed from alert email body").slice(0, 160))}...</p>

                    <div class="chip-list">
                      <span class="chip" style="background:rgba(59,130,246,0.1); color:#60a5fa; font-size:10px;">${isSuperset ? "Superset Notification" : "Gmail LinkedIn Alert"}</span>
                      ${techChips.slice(0, 3).map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}
                    </div>

                    <div class="job-card__actions">
                      <button class="btn btn-secondary btn--compact" data-action="tailor-job" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span>
                        <span>Tailor Resume</span>
                      </button>
                      <button class="btn btn-primary btn--compact" data-action="apply-info" data-id="${job.id}">
                        <span class="material-symbols-outlined" style="font-size:14px;">assignment_turned_in</span>
                        <span>Review &amp; Apply</span>
                      </button>
                    </div>
                  </article>
                `;
                })
                .join("")
            : `
            <div class="glass-card" style="grid-column:1 / -1; padding:48px; text-align:center;">
              <span class="material-symbols-outlined" style="font-size:48px; color:#3b82f6; margin-bottom:12px;">mark_email_unread</span>
              <h3 style="font-size:16px; margin-bottom:6px;">No Gmail alerts synced yet</h3>
              <p style="font-size:13px; color:var(--text-dim); margin-bottom:20px;">Click below to scan your inbox for LinkedIn alert emails &amp; Superset messages.</p>
              <button class="btn btn-primary btn--compact" data-action="scan" style="background:#3b82f6; border-color:#3b82f6;">Sync Gmail Alerts</button>
            </div>
          `
        }
      </div>
    </section>
  `;
}

/* 2. Applications Pipeline View (Kanban) */
function buildApplicationsView() {
  const jobs = state.jobs;
  const cols = [
    { key: "new", title: "New Alerts", icon: "inbox", count: jobs.filter((j) => !j.status || j.status === "new").length },
    { key: "tailored", title: "Tailored", icon: "auto_awesome", count: jobs.filter((j) => j.status === "tailored").length },
    { key: "applied", title: "Applied", icon: "send", count: jobs.filter((j) => j.status === "applied").length },
    { key: "interviewing", title: "Interviewing", icon: "forum", count: jobs.filter((j) => j.status === "interviewing").length },
    { key: "offer", title: "Offers", icon: "verified", count: jobs.filter((j) => j.status === "offer").length },
  ];

  return `
    <section class="page applications">
      <div class="section-header">
        <div>
          <h2>Applications Pipeline</h2>
          <p>Kanban tracking from discovery through tailored materials, submission, and interview stages.</p>
        </div>
        <button class="btn btn-secondary btn--compact" data-action="refresh-all">
          <span class="material-symbols-outlined" style="font-size:16px;">refresh</span>
          Refresh Board
        </button>
      </div>

      <div class="pipeline-board">
        ${cols
          .map((col) => {
            const colJobs = jobs.filter((j) => (j.status || "new") === col.key);
            return `
            <div class="pipeline-col">
              <div class="pipeline-col-header">
                <div class="pipeline-col-title">
                  <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary);">${col.icon}</span>
                  <span>${col.title}</span>
                </div>
                <span class="pipeline-col-count">${col.count}</span>
              </div>

              <div class="pipeline-cards">
                ${
                  colJobs.length
                    ? colJobs
                        .map(
                          (job) => `
                        <div class="pipeline-card" data-action="apply-info" data-id="${job.id}">
                          <div class="pipeline-card__title">${escapeHtml(job.title || "Role")}</div>
                          <div class="pipeline-card__company">${escapeHtml(job.company || "Company")} · <span style="color:var(--primary);">${escapeHtml(job.ats || "Direct")}</span></div>
                          <div class="pipeline-card__footer">
                            <span class="chip ${scoreTone(job.match_score) === "good" ? "chip--secondary" : "chip--muted"}">${scoreLabel(job)} match</span>
                            <button class="btn btn-secondary btn--compact" data-action="change-status" data-id="${job.id}" data-current="${job.status || "new"}" title="Advance status" style="padding:2px 6px;">
                              <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      `
                        )
                        .join("")
                    : `<div style="padding:24px 8px; text-align:center; color:var(--text-dim); font-size:12px;">No roles in this column</div>`
                }
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </section>
  `;
}

/* 3. Resume Studio / Tailored Documents View */
function buildStudioView() {
  const tailoredJobs = state.jobs.filter((j) => j.tailored_resume || j.tailored_cover_letter || j.status === "tailored" || j.status === "applied");

  return `
    <section class="page studio">
      <div class="section-header">
        <div>
          <h2>Resume Studio · Tailored Documents</h2>
          <p>Dedicated studio for AI-generated tailored resumes, cover letters, and outreach materials.</p>
        </div>
      </div>

      <div class="studio-grid">
        ${
          tailoredJobs.length
            ? tailoredJobs
                .map(
                  (job) => `
                <article class="studio-card">
                  <div class="studio-card__header">
                    <div>
                      <h3 style="font-size:15px; font-weight:700; color:var(--text);">${escapeHtml(job.company || "Company")} — ${escapeHtml(job.title || "Role")}</h3>
                      <p style="font-size:12px; color:var(--text-dim); margin-top:2px;">Tailored from Master Profile · Status: <span style="color:var(--primary); font-weight:600;">${escapeHtml(job.status || "tailored")}</span></p>
                    </div>
                    ${scoreRing(job)}
                  </div>

                  <div>
                    <div style="font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:6px;">Tailored Bullets Preview</div>
                    <div class="studio-preview-box">${escapeHtml(job.tailored_resume || "Tailored experience bullet points generated for this role.")}</div>
                  </div>

                  <div>
                    <div style="font-size:11px; font-weight:700; color:var(--secondary); text-transform:uppercase; margin-bottom:6px;">Cover Letter Draft</div>
                    <div class="studio-preview-box">${escapeHtml(job.tailored_cover_letter || "Concise custom cover letter tailored to the job description requirements.")}</div>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:12px; border-top:1px solid var(--border-soft);">
                    <button class="btn btn-primary btn--compact" data-action="tailor-job" data-id="${job.id}">
                      <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
                      Open in Studio Drawer
                    </button>
                    <button class="btn btn-secondary btn--compact" data-action="apply-info" data-id="${job.id}">
                      Review &amp; Apply
                    </button>
                  </div>
                </article>
              `
                )
                .join("")
            : `
              <div class="glass-card" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
                <span class="material-symbols-outlined" style="font-size: 44px; color: var(--text-dim); margin-bottom: 12px;">auto_awesome_motion</span>
                <h3 style="font-size:16px; font-weight:600; margin-bottom:6px;">No tailored documents yet</h3>
                <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">Go to the Jobs Dashboard and click "Tailor" on any role to generate custom bullets &amp; cover letters.</p>
                <button class="btn btn-primary btn--compact" data-action="load-sample-jobs">
                  Seed Sample Roles with Tailored Materials
                </button>
              </div>
            `
        }
      </div>
    </section>
  `;
}

/* 4. Complete Master Profile System (All 13 user sections + Real Parser + Preview & Split View) */
function buildProfileSystemView() {
  const subTab = state.profileSubTab;

  return `
    <section class="page profile-system">
      <div class="section-header">
        <div>
          <h2>Profile &amp; Documents</h2>
          <p>Your single source of truth Master Profile. All AI job matching, tailoring, and applications draw directly from here.</p>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          ${
            subTab === "master"
              ? `
            <button class="split-view-toggle ${state.splitViewActive ? "active" : ""}" data-action="toggle-split-view" title="Toggle side-by-side resume preview">
              <span class="material-symbols-outlined" style="font-size:16px;">view_sidebar</span>
              <span>${state.splitViewActive ? "Hide Resume Preview" : "Show Resume Preview"}</span>
            </button>
          `
              : ""
          }
          <button class="btn btn-secondary btn--compact" data-action="switch-profile-tab" data-tab="upload">
            <span class="material-symbols-outlined" style="font-size:16px;">upload_file</span>
            Upload / Replace Resume
          </button>
          <button class="btn btn-primary" data-action="save-master-profile">
            <span class="material-symbols-outlined" style="font-size:18px;">save</span>
            Save Master Profile
          </button>
        </div>
      </div>

      <!-- Profile Sub Navigation Tabs -->
      <nav class="sub-nav-tabs" aria-label="Profile sub-navigation">
        <button class="sub-tab-btn ${subTab === "master" ? "active" : ""}" data-action="switch-profile-tab" data-tab="master">
          <span class="material-symbols-outlined">person</span>
          Master Profile
        </button>
        <button class="sub-tab-btn ${subTab === "preferences" ? "active" : ""}" data-action="switch-profile-tab" data-tab="preferences">
          <span class="material-symbols-outlined">tune</span>
          Job Preferences
        </button>
        <button class="sub-tab-btn ${subTab === "application_profile" ? "active" : ""}" data-action="switch-profile-tab" data-tab="application_profile">
          <span class="material-symbols-outlined">assignment_ind</span>
          Application Profile
        </button>
        <button class="sub-tab-btn ${subTab === "tailoring_rules" ? "active" : ""}" data-action="switch-profile-tab" data-tab="tailoring_rules">
          <span class="material-symbols-outlined">shield</span>
          AI Tailoring Rules
        </button>
        <button class="sub-tab-btn ${subTab === "master_resume" ? "active" : ""}" data-action="switch-profile-tab" data-tab="master_resume">
          <span class="material-symbols-outlined">description</span>
          Master Resume &amp; Preview
        </button>
      </nav>

      <!-- Sub Tab Content -->
      ${renderProfileSubTabContent(subTab)}
    </section>
  `;
}

function renderResumePreviewBox() {
  const file = state.masterProfile.masterResumeFile || {};
  const hasFile = Boolean(file.fileName) || Boolean(state.resumeRawText);

  if (!hasFile) {
    return `
      <aside class="resume-preview-panel">
        <div class="resume-preview-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-outlined" style="font-size:18px; color:var(--text-dim);">description</span>
            <span style="font-size:13px; font-weight:700; color:var(--text-dim);">Resume Preview</span>
          </div>
        </div>
        <div style="padding:48px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:500px; color:var(--text-dim);">
          <span class="material-symbols-outlined" style="font-size:44px; margin-bottom:12px; opacity:0.35;">upload_file</span>
          <h4 style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:6px;">No Resume Uploaded Yet</h4>
          <p style="font-size:12.5px; max-width:280px; line-height:1.5; margin-bottom:18px;">
            Upload your PDF resume to preview your document and extract your profile sections.
          </p>
          <button class="btn btn-primary btn--compact" data-action="switch-profile-tab" data-tab="upload">
            <span class="material-symbols-outlined" style="font-size:16px;">upload</span>
            Upload Resume PDF
          </button>
        </div>
      </aside>
    `;
  }

  return `
    <aside class="resume-preview-panel">
      <div class="resume-preview-header">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary);">visibility</span>
          <span style="font-size:13px; font-weight:700; color:var(--text);">${escapeHtml(file.fileName || "Uploaded Resume")}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="btn btn-secondary btn--compact" data-action="toggle-preview-mode" style="padding:3px 8px; font-size:11px;">
            ${state.previewMode === "pdf" ? "Text View" : "Doc View"}
          </button>
          <a class="btn btn-secondary btn--compact" href="/api/profile/resume-file" target="_blank" download title="Open in new window" style="padding:3px 8px;">
            <span class="material-symbols-outlined" style="font-size:14px;">open_in_new</span>
          </a>
        </div>
      </div>

      ${
        state.previewMode === "text" && state.resumeRawText
          ? `<div class="resume-raw-text-viewer">${escapeHtml(state.resumeRawText)}</div>`
          : `<iframe src="/api/profile/resume-file#toolbar=0" class="resume-preview-frame" title="Resume Document Preview"></iframe>`
      }
    </aside>
  `;
}

function renderProfileSubTabContent(tab) {
  const p = state.masterProfile;

  if (tab === "upload") {
    return `
      <div style="max-width:640px; margin:0 auto;">
        <div class="dropzone-container" id="resume-dropzone" data-action="trigger-file-upload">
          <div class="dropzone-icon">
            <span class="material-symbols-outlined" style="font-size:32px;">picture_as_pdf</span>
          </div>
          <h3 class="dropzone-title">Upload your resume to get started</h3>
          <p class="dropzone-sub">Drag &amp; Drop Resume • PDF only • Max 10 MB</p>
          <input type="file" id="resume-file-input" accept=".pdf,application/pdf" style="display:none;" />
          <button class="btn btn-primary" data-action="trigger-file-upload">
            <span class="material-symbols-outlined" style="font-size:18px;">folder_open</span>
            Browse PDF File
          </button>
        </div>

        <div id="analysis-box" class="analysis-pipeline-box" style="display:none; margin-top:24px;">
          <h3 style="font-size:16px; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-outlined" style="color:var(--primary); animation:spin 1s linear infinite;">psychology</span>
            Analyzing your resume...
          </h3>

          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Extracting text &amp; links</div>
          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Identifying phone, LinkedIn &amp; GitHub</div>
          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Extracting education &amp; CGPA</div>
          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Extracting projects &amp; tech stack</div>
          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Extracting categorized skills</div>
          <div class="analysis-step done"><span class="material-symbols-outlined step-icon">check_circle</span> Extracting certifications &amp; awards</div>

          <div style="margin-top:24px; text-align:center;">
            <button class="btn btn-primary" data-action="switch-profile-tab" data-tab="master" style="width:100%;">
              Review Extracted Information Side-by-Side →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (tab === "preferences") {
    const prefs = p.jobPreferences || {};
    return `
      <div style="max-width:800px; margin:0 auto;">
        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">work</span>
              <span>Target Roles</span>
            </div>
          </div>
          <div class="chips" style="margin-bottom:12px;" id="target-roles-chips">
            ${(prefs.targetRoles || []).map((r, i) => `<span class="skill-tag">${escapeHtml(r)} <span class="skill-tag-remove" data-action="remove-role" data-idx="${i}">×</span></span>`).join("")}
          </div>
          <div style="display:flex; gap:10px;">
            <input type="text" id="add-role-input" class="form-input" placeholder="Add target role (e.g. React Developer)..." />
            <button class="btn btn-secondary btn--compact" data-action="add-role">Add</button>
          </div>
        </div>

        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">location_on</span>
              <span>Preferred Locations</span>
            </div>
          </div>
          <div class="chips" style="margin-bottom:12px;">
            ${(prefs.preferredLocations || []).map((loc) => `<span class="chip chip--primary">${escapeHtml(loc)}</span>`).join("")}
          </div>
        </div>

        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">domain</span>
              <span>Work Mode &amp; Employment Type</span>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="pref-box">
              <div class="pref-label">Work Mode</div>
              <div style="display:flex; gap:12px; margin-top:6px; font-size:13px;">
                <label><input type="checkbox" checked /> Remote</label>
                <label><input type="checkbox" checked /> Hybrid</label>
                <label><input type="checkbox" /> On-site</label>
              </div>
            </div>
            <div class="pref-box">
              <div class="pref-label">Employment Type</div>
              <div style="display:flex; gap:12px; margin-top:6px; font-size:13px;">
                <label><input type="checkbox" checked /> Full-time</label>
                <label><input type="checkbox" checked /> Internship</label>
                <label><input type="checkbox" /> Contract</label>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">payments</span>
              <span>Compensation &amp; Notice Period</span>
            </div>
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label class="form-label">Minimum Salary</label>
              <input type="text" class="form-input" value="${escapeHtml(prefs.salaryMin || "₹8,00,000")}" />
            </div>
            <div class="form-group">
              <label class="form-label">Maximum Target</label>
              <input type="text" class="form-input" value="${escapeHtml(prefs.salaryMax || "₹18,00,000")}" />
            </div>
            <div class="form-group">
              <label class="form-label">Notice Period</label>
              <select class="form-select">
                <option selected>Immediate</option>
                <option>15 days</option>
                <option>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (tab === "application_profile") {
    const ap = p.applicationProfile || {};
    return `
      <div style="max-width:800px; margin:0 auto;">
        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">assignment_ind</span>
              <span>Reusable Application Autofill Answers</span>
            </div>
          </div>
          <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">
            Stored reusable answers pulled automatically during job applications to prefill standard ATS forms (Greenhouse, Lever, etc.).
          </p>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <div class="form-group">
              <label class="form-label">Work Authorization Status</label>
              <input type="text" class="form-input" value="${escapeHtml(ap.workAuthorization || "Authorized to work without sponsorship")}" />
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Do you require visa sponsorship?</label>
                <select class="form-select">
                  <option selected>No</option>
                  <option>Yes</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Willing to relocate?</label>
                <select class="form-select">
                  <option selected>Yes</option>
                  <option>No</option>
                </select>
              </div>
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label">Total Years of Experience</label>
                <input type="text" class="form-input" value="${escapeHtml(ap.totalExperience || "0–1 Years (Fresher / Intern)")}" />
              </div>
              <div class="form-group">
                <label class="form-label">Expected CTC</label>
                <input type="text" class="form-input" value="${escapeHtml(ap.expectedSalary || "₹12,00,000 / year")}" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (tab === "tailoring_rules") {
    return `
      <div style="max-width:800px; margin:0 auto;">
        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">verified</span>
              <span>Mandatory Accuracy Rules</span>
            </div>
          </div>
          <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">
            Strict verification constraints enforced on all AI resume bullet and cover letter generation.
          </p>

          <div class="rule-checkbox-row">
            <div>
              <strong style="font-size:13px;">Never fabricate experience</strong>
              <div style="font-size:11px; color:var(--text-dim);">AI will only rewrite and foreground real experience from Master Profile</div>
            </div>
            <span class="rule-locked-badge"><span class="material-symbols-outlined" style="font-size:14px;">lock</span> LOCKED ACTIVE</span>
          </div>

          <div class="rule-checkbox-row">
            <div>
              <strong style="font-size:13px;">Never fabricate skills</strong>
              <div style="font-size:11px; color:var(--text-dim);">AI will not invent unlisted frameworks or programming languages</div>
            </div>
            <span class="rule-locked-badge"><span class="material-symbols-outlined" style="font-size:14px;">lock</span> LOCKED ACTIVE</span>
          </div>

          <div class="rule-checkbox-row">
            <div>
              <strong style="font-size:13px;">Never alter employment or education dates</strong>
              <div style="font-size:11px; color:var(--text-dim);">Maintains timeline consistency across all generated versions</div>
            </div>
            <span class="rule-locked-badge"><span class="material-symbols-outlined" style="font-size:14px;">lock</span> LOCKED ACTIVE</span>
          </div>

          <div class="rule-checkbox-row">
            <div>
              <strong style="font-size:13px;">Only use information from Master Profile</strong>
              <div style="font-size:11px; color:var(--text-dim);">Guarantees truthful tailoring without hallucination</div>
            </div>
            <span class="rule-locked-badge"><span class="material-symbols-outlined" style="font-size:14px;">lock</span> LOCKED ACTIVE</span>
          </div>
        </div>

        <div class="profile-section-card">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">tune</span>
              <span>Tailoring Style</span>
            </div>
          </div>
          <div style="display:flex; gap:20px; font-size:13px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="tailor-style" value="Conservative" /> Conservative (Exact match only)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="tailor-style" value="Balanced" checked /> Balanced (Optimal keyword alignment)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="tailor-style" value="Aggressive" /> Aggressive (High impact rewording)
            </label>
          </div>
        </div>
      </div>
    `;
  }

  if (tab === "master_resume") {
    const file = p.masterResumeFile || {};
    const hasFile = Boolean(file.fileName) || Boolean(state.resumeRawText);

    if (!hasFile) {
      return `
        <div style="max-width:640px; margin:0 auto; padding:48px 24px; text-align:center;">
          <div class="glass-card" style="padding:48px 24px; text-align:center;">
            <span class="material-symbols-outlined" style="font-size:52px; color:var(--text-dim); margin-bottom:14px; opacity:0.4;">upload_file</span>
            <h3 style="font-size:18px; font-weight:700; color:var(--text); margin-bottom:8px;">No Resume Uploaded Yet</h3>
            <p style="font-size:13px; color:var(--text-dim); line-height:1.5; margin-bottom:24px; max-width:360px; margin-left:auto; margin-right:auto;">
              Upload your PDF resume to view your original document here and populate your Master Profile sections.
            </p>
            <button class="btn btn-primary" data-action="switch-profile-tab" data-tab="upload">
              <span class="material-symbols-outlined" style="font-size:18px;">upload</span>
              Upload Resume PDF
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div style="max-width:960px; margin:0 auto; display:flex; flex-direction:column; gap:20px;">
        <div class="profile-section-card" style="margin-bottom:0;">
          <div class="section-card-header">
            <div class="section-card-title">
              <span class="material-symbols-outlined">description</span>
              <span>Master Resume Source File</span>
            </div>
          </div>

          <div class="master-file-card">
            <div class="master-file-left">
              <div class="master-file-icon">
                <span class="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <div>
                <h4 style="font-size:15px; font-weight:700; color:var(--text);">${escapeHtml(file.fileName || "Uploaded Resume.pdf")}</h4>
                <p style="font-size:12px; color:var(--text-dim); margin-top:2px;">
                  Uploaded: ${escapeHtml(file.uploadedDate || "Today")} · Size: ${escapeHtml(file.fileSize || "")} · <span style="color:var(--secondary); font-weight:600;">Active Source</span>
                </p>
              </div>
            </div>

            <div style="display:flex; gap:10px;">
              <a class="btn btn-secondary btn--compact" href="/api/profile/resume-file" target="_blank" download>
                <span class="material-symbols-outlined" style="font-size:16px;">download</span>
                Download
              </a>
              <button class="btn btn-primary btn--compact" data-action="switch-profile-tab" data-tab="upload">
                <span class="material-symbols-outlined" style="font-size:16px;">sync</span>
                Replace File
              </button>
            </div>
          </div>
        </div>

        <div class="profile-section-card" style="padding:0; overflow:hidden;">
          <div style="padding:14px 20px; background:var(--surface-container); border-bottom:1px solid var(--border-soft); display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; font-weight:700;">Live Resume Preview</div>
            <a href="/api/profile/resume-file" target="_blank" class="btn btn-secondary btn--compact" style="font-size:11px; padding:3px 8px;">Full Screen</a>
          </div>
          <iframe src="/api/profile/resume-file" style="width:100%; height:680px; border:none; background:#2b2b2b;" title="Master Resume Document"></iframe>
        </div>
      </div>
    `;
  }

  // DEFAULT: Master Profile Main View (Sections 1 - 7)
  const pi = p.personalInfo || {};
  const skills = p.skills || {};
  const summaryLength = (p.summary || "").length;

  const sec1 = `
    <!-- 1. Personal Information -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">badge</span>
          <span>1. Personal Information</span>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" id="pi-name" class="form-input" value="${escapeHtml(pi.fullName || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email *</label>
          <input type="email" id="pi-email" class="form-input" value="${escapeHtml(pi.email || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number *</label>
          <input type="text" id="pi-phone" class="form-input" placeholder="+91 98765 43210" value="${escapeHtml(pi.phone || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" id="pi-location" class="form-input" value="${escapeHtml(pi.location || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">LinkedIn Profile URL</label>
          <input type="text" id="pi-linkedin" class="form-input" placeholder="https://linkedin.com/in/yourname" value="${escapeHtml(pi.linkedin || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">GitHub Profile URL</label>
          <input type="text" id="pi-github" class="form-input" placeholder="https://github.com/yourhandle" value="${escapeHtml(pi.github || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">LeetCode / Coding Profile</label>
          <input type="text" id="pi-leetcode" class="form-input" placeholder="https://leetcode.com/u/yourhandle" value="${escapeHtml(pi.leetcode || "")}" />
        </div>
        <div class="form-group">
          <label class="form-label">Portfolio / Personal Website</label>
          <input type="text" id="pi-portfolio" class="form-input" placeholder="https://yourportfolio.dev" value="${escapeHtml(pi.portfolio || "")}" />
        </div>
      </div>
    </div>
  `;

  const sec2 = `
    <!-- 2. Professional Summary -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">subject</span>
          <span>2. Professional Summary</span>
        </div>
        <span style="font-size:11px; color:var(--text-dim); font-family:'Geist Mono', monospace;" id="summary-char-count">
          Characters: ${summaryLength} / 1000
        </span>
      </div>
      <textarea id="summary-textarea" class="form-textarea" maxlength="1000" placeholder="Enter your high-impact professional summary...">${escapeHtml(p.summary || "")}</textarea>
    </div>
  `;

  const sec3 = `
    <!-- 3. Categorized Skills -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">code</span>
          <span>3. Categorized Skills</span>
        </div>
      </div>

      ${Object.entries({
        programming: "Programming Languages",
        frontend: "Frontend",
        backend: "Backend",
        databases: "Databases",
        ai_ml: "AI & Machine Learning",
        tools: "Developer Tools & Cloud",
      })
        .filter(([key]) => (skills[key] || []).length > 0)
        .map(([key, label]) => {
          const list = skills[key] || [];
          return `
          <div class="skill-category-block">
            <div class="skill-category-header">
              <div class="skill-category-title">
                <span class="material-symbols-outlined" style="font-size:16px;">tag</span>
                <span>${label} (${list.length})</span>
              </div>
              <button class="btn-add-skill-inline" data-action="prompt-add-skill" data-category="${key}">+ Add</button>
            </div>
            <div class="skill-tags-cloud">
              ${list
                .map(
                  (s, idx) => `
                <span class="skill-tag">
                  ${escapeHtml(s)}
                  <span class="skill-tag-remove" data-action="remove-skill" data-category="${key}" data-idx="${idx}" title="Remove skill">×</span>
                </span>
              `
                )
                .join("")}
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  const sec4 = (p.education || []).length ? `
    <!-- 4. Education -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">school</span>
          <span>4. Education</span>
        </div>
        <button class="btn btn-secondary btn--compact" data-action="modal-add-education">+ Add Education</button>
      </div>
      <div>
        ${(p.education || [])
          .map(
            (edu, idx) => `
          <div class="dynamic-item-card">
            <div class="dynamic-item-card__header">
              <div>
                <div class="dynamic-item-card__title">${escapeHtml(edu.degree || edu.institution)}</div>
                <div class="dynamic-item-card__sub">${escapeHtml(edu.institution)} ${edu.startDate || edu.endDate ? `· ${escapeHtml(edu.startDate)} – ${escapeHtml(edu.endDate)}` : ""} ${edu.grade ? `· <strong style="color:var(--secondary);">${escapeHtml(edu.grade)}</strong>` : ""}</div>
              </div>
              <button class="btn btn-secondary btn--compact" data-action="remove-education" data-idx="${idx}" style="color:var(--danger); padding:4px 8px;">Delete</button>
            </div>
            ${edu.coursework ? `<div style="font-size:12px; color:var(--text-muted); margin-top:4px;"><strong>Coursework:</strong> ${escapeHtml(edu.coursework)}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  ` : "";

  const sec5 = (p.experience || []).length ? `
    <!-- 5. Experience -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">business_center</span>
          <span>5. Experience</span>
        </div>
        <button class="btn btn-secondary btn--compact" data-action="modal-add-experience">+ Add Experience</button>
      </div>
      <div>
        ${(p.experience || [])
          .map(
            (exp, idx) => `
          <div class="dynamic-item-card">
            <div class="dynamic-item-card__header">
              <div>
                <div class="dynamic-item-card__title">${escapeHtml(exp.jobTitle)} — ${escapeHtml(exp.company)}</div>
                <div class="dynamic-item-card__sub">${escapeHtml(exp.location || "")} · ${escapeHtml(exp.startDate)} – ${escapeHtml(exp.endDate)} (${escapeHtml(exp.employmentType || "Full-time")})</div>
              </div>
              <button class="btn btn-secondary btn--compact" data-action="remove-experience" data-idx="${idx}" style="color:var(--danger); padding:4px 8px;">Delete</button>
            </div>
            <ul style="margin-left:20px; list-style:disc; margin-top:8px; font-size:13px; color:var(--text-muted);">
              ${(exp.bullets || []).map((b) => `<li style="margin-bottom:4px;">${escapeHtml(b)}</li>`).join("")}
            </ul>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  ` : "";

  const sec6 = (p.projects || []).length ? `
    <!-- 6. Projects -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">rocket_launch</span>
          <span>6. Projects</span>
        </div>
        <button class="btn btn-secondary btn--compact" data-action="modal-add-project">+ Add Project</button>
      </div>
      <div>
        ${(p.projects || [])
          .map(
            (proj, idx) => `
          <div class="dynamic-item-card">
            <div class="dynamic-item-card__header">
              <div>
                <div class="dynamic-item-card__title">${escapeHtml(proj.name)}</div>
                ${proj.technologies ? `<div style="font-size:12px; color:var(--primary); font-weight:600; margin-top:2px;">${escapeHtml(proj.technologies)}</div>` : ""}
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-secondary btn--compact" data-action="modal-edit-project" data-idx="${idx}" style="padding:4px 8px;">
                  <span class="material-symbols-outlined" style="font-size:14px;">edit</span>
                  Edit
                </button>
                <button class="btn btn-secondary btn--compact" data-action="remove-project" data-idx="${idx}" style="color:var(--danger); padding:4px 8px;">Delete</button>
              </div>
            </div>
            ${proj.description ? `<p style="font-size:13px; color:var(--text-muted); margin-top:6px;">${escapeHtml(proj.description)}</p>` : ""}
            ${proj.keyContributions ? `<p style="font-size:12px; color:var(--text-dim); margin-top:6px; line-height:1.5;">${escapeHtml(proj.keyContributions).replace(/\\n/g, "<br/>")}</p>` : ""}
            
            ${(proj.githubUrl || proj.liveDemoUrl) ? `
            <div style="display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; font-size:12px; padding-top:6px; border-top:1px solid var(--border-soft);">
              ${
                proj.githubUrl
                  ? `<a href="${escapeHtml(proj.githubUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px; color:var(--primary); font-weight:600;"><span class="material-symbols-outlined" style="font-size:15px;">code</span> GitHub Repo</a>`
                  : ""
              }
              ${
                proj.liveDemoUrl
                  ? `<a href="${escapeHtml(proj.liveDemoUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px; color:var(--secondary); font-weight:600;"><span class="material-symbols-outlined" style="font-size:15px;">open_in_new</span> Live Demo</a>`
                  : ""
              }
            </div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  ` : "";

  const sec7 = (p.certifications || []).length ? `
    <!-- 7. Certifications -->
    <div class="profile-section-card">
      <div class="section-card-header">
        <div class="section-card-title">
          <span class="material-symbols-outlined">workspace_premium</span>
          <span>7. Certifications</span>
        </div>
        <button class="btn btn-secondary btn--compact" data-action="modal-add-certification">+ Add Certification</button>
      </div>
      <div>
        ${(p.certifications || [])
          .map(
            (cert, idx) => `
          <div class="dynamic-item-card">
            <div class="dynamic-item-card__header">
              <div>
                <div class="dynamic-item-card__title">${escapeHtml(cert.name)}</div>
                <div class="dynamic-item-card__sub">${escapeHtml(cert.issuer || "")} ${cert.issueDate ? `· Issued ${escapeHtml(cert.issueDate)}` : ""} ${cert.credentialId ? `(ID: ${escapeHtml(cert.credentialId)})` : ""}</div>
              </div>
              <button class="btn btn-secondary btn--compact" data-action="remove-certification" data-idx="${idx}" style="color:var(--danger); padding:4px 8px;">Delete</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  ` : "";

  if (state.splitViewActive) {
    return `
      <div class="resume-split-layout">
        ${renderResumePreviewBox()}
        <div class="master-col">
          ${sec1}
          ${sec2}
          ${sec3}
          ${sec4}
          ${sec5}
          ${sec6}
          ${sec7}
        </div>
      </div>
    `;
  }

  return `
    <div class="master-profile-2col">
      <div class="master-col">
        ${sec1}
        ${sec2}
        ${sec3}
      </div>
      <div class="master-col">
        ${sec4}
        ${sec5}
        ${sec6}
        ${sec7}
      </div>
    </div>
  `;
}

/* 5. Analytics View */
function buildAnalyticsView() {
  const stats = deriveStats(state.jobs);
  const total = stats.total || 1;
  const highFitPct = Math.round((stats.highFit / total) * 100);
  const tailoredPct = Math.round((stats.tailored / total) * 100);
  const appliedPct = Math.round((stats.applied / total) * 100);

  return `
    <section class="page analytics">
      <div class="section-header">
        <div>
          <h2>Analytics &amp; Fit Metrics</h2>
          <p>Real-time analytics on match scoring accuracy, conversion rates, and skill distribution.</p>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="glass-card">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:16px;">
            Match Score Fit Distribution
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-row">
              <div class="progress-row-header">
                <span>High Fit (≥80%)</span>
                <span style="color:var(--secondary);">${stats.highFit} roles (${highFitPct}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${highFitPct}%; background:var(--secondary);"></div>
              </div>
            </div>

            <div class="progress-row">
              <div class="progress-row-header">
                <span>Moderate Fit (50-79%)</span>
                <span style="color:var(--tertiary);">${stats.total - stats.highFit} roles (${100 - highFitPct}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${100 - highFitPct}%; background:var(--tertiary);"></div>
              </div>
            </div>

            <div class="progress-row">
              <div class="progress-row-header">
                <span>Average Candidate Score</span>
                <span style="color:var(--primary); font-family:'Geist Mono';">${stats.average}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${stats.average}%; background:var(--primary);"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:16px;">
            Application Funnel Conversion
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-row">
              <div class="progress-row-header">
                <span>1. Ingested Alerts</span>
                <span>${stats.total} (100%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:100%; background:var(--primary);"></div>
              </div>
            </div>

            <div class="progress-row">
              <div class="progress-row-header">
                <span>2. AI Tailored</span>
                <span style="color:var(--primary);">${stats.tailored} (${tailoredPct}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${tailoredPct}%; background:var(--primary-strong);"></div>
              </div>
            </div>

            <div class="progress-row">
              <div class="progress-row-header">
                <span>3. Submitted Applications</span>
                <span style="color:var(--secondary);">${stats.applied} (${appliedPct}%)</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width:${appliedPct}%; background:var(--secondary);"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* 6. Workspace Settings View */
function buildSettingsView() {
  const s = state.settings || {};
  return `
    <section class="page settings">
      <div class="section-header">
        <div>
          <h2>Workspace Settings</h2>
          <p>Configure autonomous job search preferences, AI model credentials, and local browser controls.</p>
        </div>
        <button class="btn btn-primary btn--compact" data-action="save-settings">
          <span class="material-symbols-outlined" style="font-size:16px;">save</span>
          Save Settings
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:20px;">
        
        <!-- Self-Hosted Local Browser Job Hunter Engine -->
        <div class="glass-card" style="grid-column: 1 / -1; border-color: rgba(192, 132, 252, 0.35);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
            <div>
              <div style="font-size:14px; font-weight:700; text-transform:uppercase; color:var(--primary); display:flex; align-items:center; gap:8px;">
                <span class="material-symbols-outlined" style="font-size:18px;">explore</span>
                Self-Hosted Local Browser Job Hunter Engine
              </div>
              <p style="font-size:13px; color:var(--text-dim); margin-top:4px;">
                Autonomous single-machine pipeline: Scout Worker &rarr; Task Queue &rarr; Local Browser Collector &rarr; Extractor &rarr; 3-Tier Deduplication &rarr; Matcher &rarr; Selective Tailor.
              </p>
            </div>
            <span class="chip chip--secondary" id="hunter-browser-chip">
              Local Browser Profile Active
            </span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-soft);">
            <div style="font-size:12px; color:var(--text-dim);">
              Runs silently in the background on your local machine. No manual window or login required.
            </div>
            <button class="btn btn-primary btn--compact" data-action="run-hunter-once" style="display:inline-flex; gap:6px;">
              <span class="material-symbols-outlined" style="font-size:16px;">explore</span>
              <span>Run Job Hunter</span>
            </button>
          </div>
        </div>

        <!-- Target Career Preferences -->
        <div class="glass-card" style="grid-column: 1 / -1;">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:12px;">Job Hunter Search Preferences</div>
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">Target Employment Type</label>
              <select id="setting-employment-type" class="form-input">
                <option value="internship" ${s.employmentType === "internship" ? "selected" : ""}>Internship / Fresher / Trainee (Student Priority)</option>
                <option value="fulltime" ${s.employmentType === "fulltime" ? "selected" : ""}>Full-Time / Graduate Roles</option>
                <option value="both" ${s.employmentType === "both" ? "selected" : ""}>Both (Internships &amp; Full-Time)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Primary Target Location</label>
              <input type="text" id="setting-target-location" class="form-input" placeholder="e.g. Bengaluru, India or Remote" value="${escapeHtml(s.targetLocation || "Bengaluru")}" />
            </div>
          </div>
        </div>

        <!-- Google SSO Account -->
        <div class="glass-card">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:12px;">Account &amp; Google SSO</div>
          <p style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">Signed in via Google OAuth2 with read-only Gmail access.</p>
          <div style="font-size:13px; margin-bottom:16px;">
            <div><strong>Name:</strong> ${escapeHtml(profileName())}</div>
            <div style="margin-top:4px;"><strong>Email:</strong> ${escapeHtml(profileEmail())}</div>
          </div>
          <button class="btn btn-secondary btn--compact" data-action="logout" style="color:var(--danger);">Sign Out</button>
        </div>

        <!-- AI Provider Status -->
        <div class="glass-card">
          <div style="font-size:13px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:12px;">AI Tailoring Provider</div>
          <p style="font-size:13px; color:var(--text-dim); margin-bottom:12px;">Google Gemini free tier with deterministic local Master Profile fallback.</p>
          <div class="pref-box">
            <div class="pref-label">Active Provider</div>
            <div class="pref-value" style="color:var(--primary);">
              ${s.geminiKeyConfigured ? "Google Gemini (Free API Active)" : "Deterministic Local Master Profile Engine"}
            </div>
          </div>
        </div>

      </div>
    </section>
  `;
}

/* ==========================================================================
   Drawers & Modals
   ========================================================================== */

function openModal(html) {
  els.modalBody.innerHTML = html;
  els.modal.classList.remove("hidden");
  els.modal.setAttribute("aria-hidden", "false");
  state.drawerOpen = true;
  document.body.classList.add("modal-open");
}

function closeModal() {
  els.modal.classList.add("hidden");
  els.modal.setAttribute("aria-hidden", "true");
  state.drawerOpen = false;
  els.modalBody.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function openProjectModal(existingProj = null, index = -1) {
  const isEdit = existingProj !== null;
  const proj = existingProj || {
    name: "",
    technologies: "",
    githubUrl: "",
    liveDemoUrl: "",
    description: "",
    keyContributions: "",
  };

  openModal(`
    <div style="padding:24px; max-width:620px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <h3 style="font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--primary);">rocket_launch</span>
          <span>${isEdit ? "Edit Project Details" : "Add New Project"}</span>
        </h3>
        <button class="btn btn-secondary btn--compact" data-action="close-modal" style="padding:4px 8px;">✕</button>
      </div>

      <form id="project-form" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Project Name *</label>
          <input type="text" id="modal-proj-name" class="form-input" placeholder="e.g. TaskFlow — MERN Project Management Platform" value="${escapeHtml(proj.name || "")}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Technologies / Tech Stack</label>
          <input type="text" id="modal-proj-tech" class="form-input" placeholder="e.g. React · Node.js · Express · MongoDB · JWT" value="${escapeHtml(proj.technologies || "")}" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">GitHub Repository URL</label>
            <input type="url" id="modal-proj-github" class="form-input" placeholder="https://github.com/yourname/repo" value="${escapeHtml(proj.githubUrl || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Hosted / Live Demo URL</label>
            <input type="url" id="modal-proj-demo" class="form-input" placeholder="https://yourproject.onrender.com" value="${escapeHtml(proj.liveDemoUrl || "")}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Short Description</label>
          <input type="text" id="modal-proj-desc" class="form-input" placeholder="e.g. Full-stack collaborative project tracking platform" value="${escapeHtml(proj.description || "")}" />
        </div>

        <div class="form-group">
          <label class="form-label">Key Contributions &amp; Highlights</label>
          <textarea id="modal-proj-bullets" class="form-textarea" rows="4" placeholder="• Built responsive React frontend&#10;• Designed RESTful APIs in Express.js &amp; MongoDB&#10;• Implemented secure JWT authentication">${escapeHtml(proj.keyContributions || "")}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">
            <span class="material-symbols-outlined" style="font-size:16px;">save</span>
            ${isEdit ? "Update Project" : "Save Project"}
          </button>
        </div>
      </form>
    </div>
  `);

  const form = $("#project-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      syncInputsToMasterProfile();
      const updated = {
        id: isEdit ? existingProj.id : `proj_${Date.now()}`,
        name: $("#modal-proj-name").value.trim(),
        technologies: $("#modal-proj-tech").value.trim(),
        githubUrl: $("#modal-proj-github").value.trim(),
        liveDemoUrl: $("#modal-proj-demo").value.trim(),
        description: $("#modal-proj-desc").value.trim(),
        keyContributions: $("#modal-proj-bullets").value.trim(),
      };

      if (!state.masterProfile.projects) state.masterProfile.projects = [];

      if (isEdit && index >= 0) {
        state.masterProfile.projects[index] = updated;
        showToast("Project updated!");
      } else {
        state.masterProfile.projects.push(updated);
        showToast("Project added!");
      }
      closeModal();
      render();
    });
  }
}

function openEducationModal() {
  openModal(`
    <div style="padding:24px; max-width:560px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <h3 style="font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--primary);">school</span>
          <span>Add Education Record</span>
        </h3>
        <button class="btn btn-secondary btn--compact" data-action="close-modal" style="padding:4px 8px;">✕</button>
      </div>

      <form id="edu-form" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Degree &amp; Major *</label>
          <input type="text" id="modal-edu-degree" class="form-input" placeholder="e.g. B.E. in Computer Science and Engineering" required />
        </div>
        <div class="form-group">
          <label class="form-label">Institution / College Name *</label>
          <input type="text" id="modal-edu-inst" class="form-input" placeholder="e.g. Nitte Meenakshi Institute of Technology, Bengaluru" required />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Start Year</label>
            <input type="text" id="modal-edu-start" class="form-input" placeholder="2023" />
          </div>
          <div class="form-group">
            <label class="form-label">End Year (or Expected)</label>
            <input type="text" id="modal-edu-end" class="form-input" placeholder="2027" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">CGPA / Percentage / Grade</label>
            <input type="text" id="modal-edu-grade" class="form-input" placeholder="CGPA: 9.64 or 96%" />
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" id="modal-edu-loc" class="form-input" placeholder="Bengaluru, India" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Relevant Coursework</label>
          <input type="text" id="modal-edu-course" class="form-input" placeholder="Data Structures, DBMS, Operating Systems" />
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Education</button>
        </div>
      </form>
    </div>
  `);

  const form = $("#edu-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      syncInputsToMasterProfile();
      if (!state.masterProfile.education) state.masterProfile.education = [];
      state.masterProfile.education.push({
        id: `edu_${Date.now()}`,
        degree: $("#modal-edu-degree").value.trim(),
        institution: $("#modal-edu-inst").value.trim(),
        startDate: $("#modal-edu-start").value.trim() || "2023",
        endDate: $("#modal-edu-end").value.trim() || "2027",
        grade: $("#modal-edu-grade").value.trim(),
        location: $("#modal-edu-loc").value.trim() || "Bengaluru, India",
        coursework: $("#modal-edu-course").value.trim(),
      });
      showToast("Education added!");
      closeModal();
      render();
    });
  }
}

function openExperienceModal() {
  openModal(`
    <div style="padding:24px; max-width:560px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <h3 style="font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--primary);">business_center</span>
          <span>Add Work Experience / Internship</span>
        </h3>
        <button class="btn btn-secondary btn--compact" data-action="close-modal" style="padding:4px 8px;">✕</button>
      </div>

      <form id="exp-form" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Job / Role Title *</label>
          <input type="text" id="modal-exp-title" class="form-input" placeholder="e.g. Software Engineering Intern" required />
        </div>
        <div class="form-group">
          <label class="form-label">Company / Organization Name *</label>
          <input type="text" id="modal-exp-comp" class="form-input" placeholder="e.g. TechNova Solutions" required />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="text" id="modal-exp-start" class="form-input" placeholder="Jan 2026" />
          </div>
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input type="text" id="modal-exp-end" class="form-input" placeholder="Present" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Responsibilities &amp; Achievements (1 bullet per line)</label>
          <textarea id="modal-exp-bullets" class="form-textarea" rows="3" placeholder="• Developed responsive React UI components&#10;• Built backend API endpoints handling 50k+ requests"></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Experience</button>
        </div>
      </form>
    </div>
  `);

  const form = $("#exp-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      syncInputsToMasterProfile();
      if (!state.masterProfile.experience) state.masterProfile.experience = [];
      const bulletsRaw = $("#modal-exp-bullets").value.trim();
      const bullets = bulletsRaw
        ? bulletsRaw.split("\n").map((b) => b.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean)
        : [];
      state.masterProfile.experience.push({
        id: `exp_${Date.now()}`,
        jobTitle: $("#modal-exp-title").value.trim(),
        company: $("#modal-exp-comp").value.trim(),
        startDate: $("#modal-exp-start").value.trim() || "2025",
        endDate: $("#modal-exp-end").value.trim() || "Present",
        location: "Bengaluru",
        employmentType: "Internship",
        bullets,
      });
      showToast("Experience added!");
      closeModal();
      render();
    });
  }
}

function openCertificationModal() {
  openModal(`
    <div style="padding:24px; max-width:520px; width:100%;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <h3 style="font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--primary);">workspace_premium</span>
          <span>Add Certification</span>
        </h3>
        <button class="btn btn-secondary btn--compact" data-action="close-modal" style="padding:4px 8px;">✕</button>
      </div>

      <form id="cert-form" style="display:flex; flex-direction:column; gap:14px;">
        <div class="form-group">
          <label class="form-label">Certification Name *</label>
          <input type="text" id="modal-cert-name" class="form-input" placeholder="e.g. MongoDB Node.js Developer Path" required />
        </div>
        <div class="form-group">
          <label class="form-label">Issuing Organization *</label>
          <input type="text" id="modal-cert-issuer" class="form-input" placeholder="e.g. MongoDB or Infosys Springboard" required />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Issue Date / Year</label>
            <input type="text" id="modal-cert-date" class="form-input" placeholder="2025" />
          </div>
          <div class="form-group">
            <label class="form-label">Credential ID (Optional)</label>
            <input type="text" id="modal-cert-id" class="form-input" placeholder="e.g. CERT-12345" />
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Certification</button>
        </div>
      </form>
    </div>
  `);

  const form = $("#cert-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      syncInputsToMasterProfile();
      if (!state.masterProfile.certifications) state.masterProfile.certifications = [];
      state.masterProfile.certifications.push({
        id: `cert_${Date.now()}`,
        name: $("#modal-cert-name").value.trim(),
        issuer: $("#modal-cert-issuer").value.trim(),
        issueDate: $("#modal-cert-date").value.trim() || "2025",
        credentialId: $("#modal-cert-id").value.trim(),
      });
      showToast("Certification added!");
      closeModal();
      render();
    });
  }
}

function renderDrawerJob(job, variant, payload) {
  const scoreText = job.match_score == null ? "No score yet" : `${job.match_score}% match`;
  const title = escapeHtml(job.title || "Untitled role");
  const company = escapeHtml(job.company || "Unknown company");
  const subtitle = escapeHtml(job.final_url ? "Public posting available" : "Application review");

  const tabs =
    variant === "tailor"
      ? `
        <nav class="drawer-tabs" aria-label="Tailoring tabs">
          <button class="drawer-tab active" data-drawer-tab="resume">
            <span class="material-symbols-outlined" style="font-size:16px;">description</span>
            Tailored Resume
          </button>
          <button class="drawer-tab" data-drawer-tab="cover">
            <span class="material-symbols-outlined" style="font-size:16px;">article</span>
            Cover Letter
          </button>
          <button class="drawer-tab" data-drawer-tab="email">
            <span class="material-symbols-outlined" style="font-size:16px;">mail</span>
            Outreach Email
          </button>
        </nav>
      `
      : `
        <nav class="drawer-tabs" aria-label="Application tabs">
          <button class="drawer-tab active" data-drawer-tab="payload">
            <span class="material-symbols-outlined" style="font-size:16px;">data_object</span>
            Submission Payload
          </button>
          <button class="drawer-tab" data-drawer-tab="checklist">
            <span class="material-symbols-outlined" style="font-size:16px;">checklist</span>
            Checklist
          </button>
          <button class="drawer-tab" data-drawer-tab="apply">
            <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
            Official Link
          </button>
        </nav>
      `;

  const rightPane =
    variant === "tailor"
      ? `
        <div class="drawer-panel active" data-pane="resume">
          <pre class="pre-wrap" style="font-family:'Geist Mono', monospace; font-size:12.5px; line-height:1.6; color:#e4e4e7; background:#09090b; padding:16px; border-radius:8px; border:1px solid var(--border);">${escapeHtml(payload.resumeBullets || "Tailored resume bullets ready.")}</pre>
        </div>
        <div class="drawer-panel" data-pane="cover">
          <pre class="pre-wrap" style="font-family:'Geist Mono', monospace; font-size:12.5px; line-height:1.6; color:#e4e4e7; background:#09090b; padding:16px; border-radius:8px; border:1px solid var(--border);">${escapeHtml(payload.coverLetter || "Cover letter ready.")}</pre>
        </div>
        <div class="drawer-panel" data-pane="email">
          <pre class="pre-wrap" style="font-family:'Geist Mono', monospace; font-size:12.5px; line-height:1.6; color:#e4e4e7; background:#09090b; padding:16px; border-radius:8px; border:1px solid var(--border);">${escapeHtml(
            `Subject: Application for ${job.title} — ${profileName()}\n\nDear ${job.company || "Hiring Manager"},\n\n${(
              payload.coverLetter || "I am writing to express my strong interest in this position."
            ).slice(0, 380)}\n\nBest regards,\n${profileName()}`
          )}</pre>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-soft);">
          <button class="btn btn-primary" data-action="copy-tailored">
            <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span>
            Copy Content
          </button>
          <button class="btn btn-secondary" data-action="mark-status" data-id="${job.id}" data-status="tailored">
            Mark as Tailored
          </button>
        </div>
      `
      : `
        <div class="drawer-panel active" data-pane="payload">
          <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--text-dim);">Standardized ATS Submission Object</span>
            <button class="btn btn-secondary btn--compact" data-action="copy-json" style="font-size:11px; padding:3px 8px;">
              <span class="material-symbols-outlined" style="font-size:14px;">content_copy</span>
              Copy JSON
            </button>
          </div>
          <pre id="payload-json-pre" class="pre-wrap" style="font-family:'Geist Mono', monospace; font-size:11px; max-height:280px; overflow-y:auto; color:#a1a1aa; background:#09090b; padding:14px; border-radius:8px; border:1px solid var(--border);">${escapeHtml(
            JSON.stringify(payload.payload || payload.posting || { jobTitle: job.title, company: job.company }, null, 2)
          )}</pre>
        </div>
        <div class="drawer-panel" data-pane="checklist">
          <div style="display:flex; flex-direction:column; gap:10px; max-height:320px; overflow-y:auto;">
            ${
              payload.payload?.candidate
                ? `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Candidate Name</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.candidate.fullName)}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.candidate.fullName)}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Email</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.candidate.email)}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.candidate.email)}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Phone</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.candidate.phone || "N/A")}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.candidate.phone || "")}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Work Authorization</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.screeningAnswers?.workAuthorization || "Authorized")}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.screeningAnswers?.workAuthorization || "")}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Visa Sponsorship Needed?</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.screeningAnswers?.visaSponsorship || "No")}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.screeningAnswers?.visaSponsorship || "No")}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:6px;">
                <div><div style="font-size:11px; color:var(--text-dim);">Notice Period</div><div style="font-size:13px; font-weight:600;">${escapeHtml(payload.payload.screeningAnswers?.noticePeriod || "Immediate")}</div></div>
                <button class="btn btn-secondary btn--compact" data-action="copy-val" data-val="${escapeHtml(payload.payload.screeningAnswers?.noticePeriod || "Immediate")}" style="padding:2px 8px; font-size:11px;">Copy</button>
              </div>
            `
                : `<pre class="pre-wrap">• Review job description requirements.\n• Confirm tailored resume matches requirements.\n• Submit application via external portal.\n• Mark status as Applied in JobHQ.</pre>`
            }
          </div>
        </div>
        <div class="drawer-panel" data-pane="apply">
          <div style="padding:24px; text-align:center;">
            <p style="font-size:14px; margin-bottom:18px; color:var(--text-muted);">Launch application on official company career portal:</p>
            <a class="btn btn-primary" href="${escapeHtml(payload.applyUrl || "#")}" target="_blank" rel="noreferrer" style="display:inline-flex; gap:8px;">
              <span>Open Official Job Board</span>
              <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
            </a>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--border-soft);">
          <button class="btn btn-primary" data-action="mark-status" data-id="${job.id}" data-status="applied">
            <span class="material-symbols-outlined" style="font-size:16px;">check</span>
            Mark as Applied
          </button>
        </div>
      `;

  return `
    <div style="padding:20px 24px; border-bottom:1px solid var(--border-soft); display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="job-avatar">${escapeHtml(initialsFromJob(job))}</div>
        <div>
          <h2 id="drawer-title" style="font-size:16px; font-weight:700; color:var(--text);">${title}</h2>
          <p style="font-size:12px; color:var(--text-dim); margin-top:2px;">${company} · ${subtitle}</p>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; margin-right:48px;">
        <span class="chip ${scoreTone(job.match_score) === "good" ? "chip--secondary" : "chip--muted"}">${scoreText}</span>
      </div>
    </div>
    <div class="drawer-shell">
      <div class="drawer-column drawer-column--left">
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px;">
          <span class="chip chip--primary" style="text-transform:capitalize;">${escapeHtml(job.employment_type || "Full-time")}</span>
          <span class="chip chip--secondary" style="text-transform:capitalize;">${escapeHtml(job.experience_level || "Entry Level")}</span>
          <span class="chip chip--muted" style="text-transform:capitalize;">${escapeHtml(job.workplace_type || "Hybrid")}</span>
        </div>

        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--primary); margin-bottom:8px;">Match Analysis Breakdown</div>
          <p style="font-size:12px; color:var(--text-dim); line-height:1.5; margin-bottom:10px;">
            ${escapeHtml(job.match_reason || "Evaluated against candidate Master Profile.")}
          </p>
        </div>

        <h4 style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:8px;">Job Description</h4>
        <div style="font-size:12.5px; color:var(--text-muted); line-height:1.6; max-height:260px; overflow-y:auto; padding-right:6px;">${escapeHtml(job.description || "No description")}</div>
      </div>
      <div class="drawer-column drawer-column--right">
        ${tabs}
        <div class="drawer-panels">
          ${rightPane}
        </div>
      </div>
    </div>
  `;
}

function attachDrawerTabs() {
  $$("[data-drawer-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const pane = button.dataset.drawerTab;
      const root = els.modalBody;
      $$("[data-drawer-tab]", root).forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      $$("[data-pane]", root).forEach((panel) => panel.classList.remove("active"));
      const activePane = $(`[data-pane="${pane}"]`, root);
      if (activePane) activePane.classList.add("active");
    });
  });
}

async function tailorJob(id) {
  const job = state.jobs.find((item) => String(item.id) === String(id));
  if (!job) return;

  openModal(`
    <div style="padding:32px; text-align:center;">
      <span class="material-symbols-outlined" style="font-size:40px; color:var(--primary); animation:spin 1s linear infinite;">sync</span>
      <h3 style="font-size:16px; margin:16px 0 6px;">Tailoring with Master Profile...</h3>
      <p style="font-size:13px; color:var(--text-dim);">Strictly drawing verified experience for ${escapeHtml(job.company || "Company")}...</p>
    </div>
  `);

  try {
    const res = await fetch(`/api/jobs/${id}/tailor`, { method: "POST" });
    const data = await res.json();

    if (data.error) {
      openModal(`
        <div style="padding:24px;">
          <div style="padding:16px; background:var(--danger-soft); border:1px solid var(--danger); border-radius:8px; color:var(--danger); font-size:13px;">
            <strong>Tailoring failed:</strong> ${escapeHtml(data.error)}
          </div>
        </div>
      `);
      return;
    }

    job.status = "tailored";
    job.tailored_resume = data.resumeBullets;
    job.tailored_cover_letter = data.coverLetter;
    render();
    openModal(renderDrawerJob(job, "tailor", data));
    attachDrawerTabs();
    showToast("Tailored materials generated in Resume Studio!");
  } catch (err) {
    openModal(`
      <div style="padding:24px;">
        <div style="padding:16px; background:var(--danger-soft); border:1px solid var(--danger); border-radius:8px; color:var(--danger); font-size:13px;">
          <strong>Request failed:</strong> ${escapeHtml(err.message)}
        </div>
      </div>
    `);
  }
}

async function showApplyInfo(id) {
  const job = state.jobs.find((item) => String(item.id) === String(id));
  if (!job) return;

  openModal(`
    <div style="padding:32px; text-align:center;">
      <span class="material-symbols-outlined" style="font-size:40px; color:var(--primary); animation:spin 1s linear infinite;">sync</span>
      <h3 style="font-size:16px; margin:16px 0 6px;">Loading Application Payload...</h3>
      <p style="font-size:13px; color:var(--text-dim);">Inspecting ATS endpoints for ${escapeHtml(job.company || "Company")}...</p>
    </div>
  `);

  try {
    const res = await fetch(`/api/jobs/${id}/apply-info`);
    const data = await res.json();
    openModal(renderDrawerJob(job, "apply", data));
    attachDrawerTabs();
  } catch (err) {
    openModal(`
      <div style="padding:24px;">
        <div style="padding:16px; background:var(--danger-soft); border:1px solid var(--danger); border-radius:8px; color:var(--danger); font-size:13px;">
          <strong>Review failed:</strong> ${escapeHtml(err.message)}
        </div>
      </div>
    `);
  }
}

function syncInputsToMasterProfile() {
  const nameEl = $("#pi-name");
  if (nameEl) state.masterProfile.personalInfo.fullName = nameEl.value.trim();
  const emailEl = $("#pi-email");
  if (emailEl) state.masterProfile.personalInfo.email = emailEl.value.trim();
  const phoneEl = $("#pi-phone");
  if (phoneEl) state.masterProfile.personalInfo.phone = phoneEl.value.trim();
  const locEl = $("#pi-location");
  if (locEl) state.masterProfile.personalInfo.location = locEl.value.trim();
  const linEl = $("#pi-linkedin");
  if (linEl) state.masterProfile.personalInfo.linkedin = linEl.value.trim();
  const gitEl = $("#pi-github");
  if (gitEl) state.masterProfile.personalInfo.github = gitEl.value.trim();
  const leetEl = $("#pi-leetcode");
  if (leetEl) state.masterProfile.personalInfo.leetcode = leetEl.value.trim();
  const portEl = $("#pi-portfolio");
  if (portEl) state.masterProfile.personalInfo.portfolio = portEl.value.trim();
  const sumEl = $("#summary-textarea");
  if (sumEl) state.masterProfile.summary = sumEl.value.trim();
}

async function saveMasterProfile() {
  syncInputsToMasterProfile();

  const compiledText = compileMasterProfileToText(state.masterProfile);

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: compiledText, structured: state.masterProfile }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast("Master Profile saved successfully!");
      render();
    }
  } catch (e) {
    showToast("Failed to save Master Profile", "error");
  }
}

async function uploadResumeFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    showToast("Only PDF resumes are supported (.pdf)", "error");
    return;
  }

  const dropzone = $("#resume-dropzone");
  const analysisBox = $("#analysis-box");
  if (dropzone) dropzone.style.display = "none";
  if (analysisBox) analysisBox.style.display = "block";

  showToast(`Uploading and analyzing ${file.name}...`, "sync");

  const formData = new FormData();
  formData.append("resume", file);

  try {
    const res = await fetch("/api/profile/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    const parsed = data.parsed || data.structured;
    if (data.ok && parsed) {
      state.masterProfile = {
        ...defaultMasterProfile,
        ...parsed,
        personalInfo: { ...defaultMasterProfile.personalInfo, ...(parsed.personalInfo || {}) },
        skills: { ...defaultMasterProfile.skills, ...(parsed.skills || {}) },
        education: Array.isArray(parsed.education) && parsed.education.length ? parsed.education : defaultMasterProfile.education,
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : defaultMasterProfile.projects,
        certifications: Array.isArray(parsed.certifications) && parsed.certifications.length ? parsed.certifications : defaultMasterProfile.certifications,
        masterResumeFile: {
          fileName: data.fileName || file.name,
          uploadedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          fileSize: data.fileSize || `${Math.round(file.size / 1024)} KB`,
          status: "Active",
        },
      };

      state.resumeRawText = data.extractedText || data.text || "";
      state.profileSubTab = "master";
      state.splitViewActive = true;
      render();
      showToast("Resume parsed accurately! Personal info, education, skills & projects updated.");
    } else {
      showToast(data.error || "Failed to parse resume", "error");
      if (dropzone) dropzone.style.display = "block";
      if (analysisBox) analysisBox.style.display = "none";
    }
  } catch (e) {
    showToast("Upload request failed: " + e.message, "error");
    if (dropzone) dropzone.style.display = "block";
    if (analysisBox) analysisBox.style.display = "none";
  }
}

async function scanJobs() {
  if (!state.authenticated) {
    window.location.href = "/auth/google";
    return;
  }

  if (els.scanBtn) {
    els.scanBtn.classList.add("scanning");
    els.scanBtn.disabled = true;
    els.scanBtn.querySelector("span:last-child").textContent = "Scanning...";
  }

  showToast("Scanning Gmail for LinkedIn job alerts...", "sync");

  try {
    const res = await fetch("/api/scan", { method: "POST" });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, "error");
    } else {
      showToast(`Scanned ${data.scanned || 0} alert emails. Loaded ${data.jobs?.length || 0} jobs.`);
      await loadJobs();
      render();
    }
  } catch (e) {
    showToast("Gmail scan encountered an error", "error");
  } finally {
    if (els.scanBtn) {
      els.scanBtn.classList.remove("scanning");
      els.scanBtn.disabled = false;
      els.scanBtn.querySelector("span:last-child").textContent = "Scan Jobs";
    }
  }
}

async function saveSettings() {
  const typeEl = $("#setting-employment-type");
  const locEl = $("#setting-target-location");

  const payload = {
    employmentType: typeEl ? typeEl.value : state.settings?.employmentType,
    targetLocation: locEl ? locEl.value.trim() : state.settings?.targetLocation,
  };

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchSettings();
      showToast("Workspace preferences saved successfully!");
      render();
    } else {
      showToast("Failed to save settings", "error");
    }
  } catch (e) {
    showToast("Save error: " + e.message, "error");
  }
}

async function loadSampleJobs() {
  showToast("Seeding realistic sample roles...", "sync");
  try {
    const res = await fetch("/api/jobs/sample", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      await loadJobs();
      render();
      showToast(`Successfully loaded ${data.count} realistic roles!`);
    }
  } catch (e) {
    showToast("Failed to load sample roles", "error");
  }
}

/* ==========================================================================
   Render Orchestration
   ========================================================================== */

function setAppBar() {
  if (els.pageTitle) {
    els.pageTitle.textContent = viewTitles[state.activeView] || "JobHQ Command Center";
  }
  if (els.userDisplayName) {
    els.userDisplayName.textContent = profileName();
  }
  if (els.userDisplayEmail) {
    els.userDisplayEmail.textContent = profileEmail();
  }
  if (els.userAvatarSm) {
    els.userAvatarSm.innerHTML = renderProfileAvatar();
  }
  if (els.userAvatarMd) {
    els.userAvatarMd.innerHTML = renderProfileAvatar();
  }
  if (els.userAvatarRail) {
    els.userAvatarRail.innerHTML = renderProfileAvatar();
  }
}

function initScrollReveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".profile-section-card, .glass-card, .job-row, .dynamic-item-card, .kpi-card, .studio-card, .pipeline-column").forEach((el) => {
      el.classList.add("is-revealed");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
        }
      });
    },
    { rootMargin: "0px 0px -20px 0px", threshold: 0.05 }
  );

  const targets = $$(
    ".profile-section-card, .glass-card, .job-row, .dynamic-item-card, .kpi-card, .stat-card, .studio-card, .pipeline-column, .master-file-card, .resume-dropzone, .skill-category-block"
  );

  targets.forEach((el, index) => {
    el.classList.add("reveal-on-scroll");
    if (!el.dataset.staggerSet) {
      el.style.transitionDelay = `${Math.min((index % 6) * 0.06, 0.36)}s`;
      el.dataset.staggerSet = "true";
    }
    observer.observe(el);
  });
}

function render() {
  document.body.classList.toggle("login-mode", !state.authenticated);
  setAppBar();

  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  });

  if (!state.authenticated) {
    els.appRoot.innerHTML = buildLoginView();
    setTimeout(initScrollReveal, 20);
    return;
  }

  switch (state.activeView) {
    case "hunter":
      els.appRoot.innerHTML = buildHunterView();
      break;
    case "gmail":
      els.appRoot.innerHTML = buildGmailAlertsView();
      break;
    case "applications":
      els.appRoot.innerHTML = buildApplicationsView();
      break;
    case "studio":
      els.appRoot.innerHTML = buildStudioView();
      break;
    case "profile":
      els.appRoot.innerHTML = buildProfileSystemView();
      break;
    case "settings":
      els.appRoot.innerHTML = buildSettingsView();
      break;
    default:
      els.appRoot.innerHTML = buildJobsView();
      break;
  }

  setTimeout(initScrollReveal, 20);
}

/* ==========================================================================
   Global Event Handlers
   ========================================================================== */

document.addEventListener("click", async (event) => {
  const filterBtn = event.target.closest("[data-filter]");
  if (filterBtn) {
    state.filter = filterBtn.dataset.filter;
    render();
    return;
  }

  const navViewBtn = event.target.closest("[data-view]");
  if (navViewBtn && !navViewBtn.closest(".user-dropdown")) {
    state.activeView = navViewBtn.dataset.view;
    closeUserMenu();
    render();
    return;
  }

  const dropdownViewBtn = event.target.closest(".dropdown-item[data-view]");
  if (dropdownViewBtn) {
    state.activeView = dropdownViewBtn.dataset.view;
    closeUserMenu();
    render();
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) {
    if (event.target === els.modal) {
      closeModal();
    }
    return;
  }

  const action = button.dataset.action;

  if (action === "toggle-user-menu") {
    toggleUserMenu();
    return;
  }

  if (action === "logout") {
    logout();
    return;
  }

  if (action === "scan") {
    await scanJobs();
    return;
  }

  if (action === "connect-gmail") {
    window.location.href = "/auth/google";
    return;
  }

  if (action === "switch-profile-tab") {
    syncInputsToMasterProfile();
    state.profileSubTab = button.dataset.tab;
    render();
    return;
  }

  if (action === "toggle-split-view") {
    syncInputsToMasterProfile();
    state.splitViewActive = !state.splitViewActive;
    render();
    return;
  }

  if (action === "toggle-preview-mode") {
    state.previewMode = state.previewMode === "pdf" ? "text" : "pdf";
    render();
    return;
  }

  if (action === "save-master-profile") {
    await saveMasterProfile();
    return;
  }

  if (action === "load-sample-jobs") {
    await loadSampleJobs();
    return;
  }

  if (action === "refresh-all") {
    await refreshAll();
    showToast("Workspace refreshed");
    return;
  }

  if (action === "tailor-job") {
    await tailorJob(button.dataset.id);
    return;
  }

  if (action === "apply-info") {
    await showApplyInfo(button.dataset.id);
    return;
  }

  if (action === "delete-job") {
    if (confirm("Remove job from workspace?")) {
      try {
        await fetch(`/api/jobs/${button.dataset.id}`, { method: "DELETE" });
        state.jobs = state.jobs.filter((j) => String(j.id) !== String(button.dataset.id));
        render();
        showToast("Job removed");
      } catch (e) {}
    }
    return;
  }

  if (action === "mark-status") {
    const id = button.dataset.id;
    const status = button.dataset.status;
    try {
      await fetch(`/api/jobs/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const job = state.jobs.find((j) => String(j.id) === String(id));
      if (job) job.status = status;
      render();
      closeModal();
      showToast(`Status updated to ${status}`);
    } catch (e) {}
    return;
  }

  if (action === "change-status") {
    const id = button.dataset.id;
    const current = button.dataset.current || "new";
    const cycle = { new: "tailored", tailored: "applied", applied: "interviewing", interviewing: "offer", offer: "new" };
    const nextStatus = cycle[current] || "applied";
    try {
      await fetch(`/api/jobs/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const job = state.jobs.find((j) => String(j.id) === String(id));
      if (job) job.status = nextStatus;
      render();
      showToast(`Moved to ${nextStatus}`);
    } catch (e) {}
    return;
  }

  if (action === "prompt-add-skill") {
    syncInputsToMasterProfile();
    const category = button.dataset.category;
    const skillName = prompt(`Add new skill to ${category}:`);
    if (skillName && skillName.trim()) {
      if (!state.masterProfile.skills[category]) state.masterProfile.skills[category] = [];
      state.masterProfile.skills[category].push(skillName.trim());
      render();
      showToast(`Added ${skillName.trim()}`);
    }
    return;
  }

  if (action === "remove-skill") {
    syncInputsToMasterProfile();
    const category = button.dataset.category;
    const idx = Number(button.dataset.idx);
    if (state.masterProfile.skills[category]) {
      state.masterProfile.skills[category].splice(idx, 1);
      render();
    }
    return;
  }

  if (action === "modal-add-education") {
    syncInputsToMasterProfile();
    openEducationModal();
    return;
  }

  if (action === "remove-education") {
    syncInputsToMasterProfile();
    state.masterProfile.education.splice(Number(button.dataset.idx), 1);
    render();
    return;
  }

  if (action === "modal-add-experience") {
    syncInputsToMasterProfile();
    openExperienceModal();
    return;
  }

  if (action === "remove-experience") {
    syncInputsToMasterProfile();
    state.masterProfile.experience.splice(Number(button.dataset.idx), 1);
    render();
    return;
  }

  if (action === "modal-add-project") {
    syncInputsToMasterProfile();
    openProjectModal(null, -1);
    return;
  }

  if (action === "modal-edit-project") {
    syncInputsToMasterProfile();
    const idx = Number(button.dataset.idx);
    const existing = (state.masterProfile.projects || [])[idx];
    if (existing) {
      openProjectModal(existing, idx);
    }
    return;
  }

  if (action === "remove-project") {
    syncInputsToMasterProfile();
    state.masterProfile.projects.splice(Number(button.dataset.idx), 1);
    render();
    return;
  }

  if (action === "modal-add-certification") {
    syncInputsToMasterProfile();
    openCertificationModal();
    return;
  }

  if (action === "remove-certification") {
    syncInputsToMasterProfile();
    state.masterProfile.certifications.splice(Number(button.dataset.idx), 1);
    render();
    return;
  }

  if (action === "trigger-file-upload") {
    const fileInput = $("#resume-file-input");
    if (fileInput) fileInput.click();
    return;
  }

  if (action === "close-modal") {
    closeModal();
    return;
  }

  if (action === "copy-tailored") {
    const activePane = $(".drawer-panel.active", els.modalBody);
    const text = activePane ? activePane.textContent.trim() : "";
    if (text) {
      await navigator.clipboard.writeText(text);
      showToast("Copied tailored content to clipboard!");
    }
    return;
  }

  if (action === "copy-json") {
    const preEl = $("#payload-json-pre");
    if (preEl) {
      await navigator.clipboard.writeText(preEl.textContent.trim());
      showToast("Copied JSON payload to clipboard!");
    }
    return;
  }

  if (action === "copy-val") {
    const val = button.dataset.val;
    if (val) {
      await navigator.clipboard.writeText(val);
      showToast(`Copied "${val.length > 25 ? val.slice(0, 25) + "..." : val}" to clipboard!`);
    }
    return;
  }

  if (action === "open-scrape-posts-modal") {
    await openScrapePostsModal();
    return;
  }

  if (action === "run-scrape-posts") {
    await runScrapePosts();
    return;
  }

  if (action === "save-settings") {
    await saveSettings();
    return;
  }

  if (action === "connect-linkedin-browser") {
    await connectLinkedInBrowserAction();
    return;
  }

  if (action === "run-hunter-once") {
    await runHunterOnceAction();
    return;
  }
});

async function connectLinkedInBrowserAction() {
  showToast("Opening visible Chrome window for LinkedIn login...", "sync");
  openModal(`
    <div style="padding:28px 24px; text-align:center; max-width:500px;">
      <span class="material-symbols-outlined" style="font-size:48px; color:var(--primary); margin-bottom:12px;">open_in_new</span>
      <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">Opening LinkedIn in Chrome...</h3>
      <p style="font-size:13px; color:var(--text-dim); line-height:1.6; margin-bottom:20px;">
        A visible Chrome browser window has opened. Please sign in to LinkedIn on your screen. Your session will be saved locally in <code>./data/browser_profile</code>.
      </p>
      <div style="display:flex; justify-content:center; gap:10px;">
        <button class="btn btn-secondary btn--compact" data-action="close-modal">Close Notice</button>
        <button class="btn btn-primary btn--compact" data-action="run-hunter-once">Run Job Hunter Now</button>
      </div>
    </div>
  `);

  try {
    const res = await fetch("/api/hunter/connect-browser", { method: "POST" });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || "Failed to open browser", "error");
    }
  } catch (e) {
    showToast("Error opening browser: " + e.message, "error");
  }
}

async function runHunterOnceAction() {
  openModal(`
    <div style="padding:32px 24px; text-align:center; max-width:520px;">
      <span class="material-symbols-outlined" style="font-size:44px; color:var(--primary); animation:spin 1s linear infinite; margin-bottom:14px;">explore</span>
      <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">Autonomous Job Hunter in Progress</h3>
      <p style="font-size:13px; color:var(--text-dim); line-height:1.6; margin-bottom:20px;">
        Executing Scout &rarr; Local Browser Scraping &rarr; Staged Extraction &rarr; 3-Tier Deduplication &rarr; Match Scoring...
      </p>
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px; font-family:'Geist Mono', monospace; font-size:11.5px; color:#a1a1aa; text-align:left;">
        <div>● [1/4] Scout: Query generation from Master Profile</div>
        <div>● [2/4] Collector: Fetching recent postings via local browser</div>
        <div>● [3/4] Extractor: Staging &amp; normalizing role metadata</div>
        <div>● [4/4] Matcher: Scoring candidate alignment</div>
      </div>
    </div>
  `);

  try {
    const res = await fetch("/api/hunter/run-once", { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = await res.json();

    if (data.ok) {
      await loadJobs();
      closeModal();
      render();
      showToast(`Hunter cycle complete! Ingested ${data.totalCollected || 0} opportunities.`);
    } else {
      openModal(`
        <div style="padding:28px 24px; text-align:center; max-width:520px;">
          <span class="material-symbols-outlined" style="font-size:44px; color:var(--warning); margin-bottom:12px;">lock_open</span>
          <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">LinkedIn Authentication Needed</h3>
          <p style="font-size:13px; color:var(--text-dim); line-height:1.6; margin-bottom:20px;">
            ${escapeHtml(data.error || data.message || "Please sign into LinkedIn in your local Chrome browser window so the Hunter can read job results.")}
          </p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn btn-secondary btn--compact" data-action="close-modal">Cancel</button>
            <button class="btn btn-primary btn--compact" data-action="connect-linkedin-browser">
              <span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span>
              Open LinkedIn Window
            </button>
          </div>
        </div>
      `);
    }
  } catch (e) {
    openModal(`
      <div style="padding:28px 24px; text-align:center; max-width:480px;">
        <span class="material-symbols-outlined" style="font-size:44px; color:var(--danger); margin-bottom:12px;">error</span>
        <h3 style="font-size:17px; font-weight:700; margin-bottom:8px;">Hunter Pipeline Notice</h3>
        <p style="font-size:13px; color:var(--danger); margin-bottom:20px;">${escapeHtml(e.message)}</p>
        <button class="btn btn-secondary btn--compact" data-action="close-modal">Dismiss</button>
      </div>
    `);
  }
}

/* Resume Upload & Dropzone Handler */
document.addEventListener("change", async (e) => {
  if (e.target && e.target.id === "resume-file-input") {
    const file = e.target.files[0];
    if (file) {
      await uploadResumeFile(file);
    }
  }
});

document.addEventListener("dragover", (e) => {
  const dropzone = e.target.closest("#resume-dropzone");
  if (dropzone) {
    e.preventDefault();
    dropzone.classList.add("dragover");
  }
});

document.addEventListener("dragleave", (e) => {
  const dropzone = e.target.closest("#resume-dropzone");
  if (dropzone) {
    dropzone.classList.remove("dragover");
  }
});

document.addEventListener("drop", async (e) => {
  const dropzone = e.target.closest("#resume-dropzone");
  if (dropzone) {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadResumeFile(e.dataTransfer.files[0]);
    }
  }
});

/* Summary Live Character Counter */
document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "summary-textarea") {
    const countEl = $("#summary-char-count");
    if (countEl) countEl.textContent = `Characters: ${e.target.value.length} / 1000`;
  }
});

/* Click Outside Dropdown Handler */
document.addEventListener("click", (event) => {
  if (state.userMenuOpen && !event.target.closest("#user-menu-wrap") && !event.target.closest(".rail-user-avatar-wrap")) {
    closeUserMenu();
  }
});

/* Keyboard Shortcuts (Cmd+K / Ctrl+K) */
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault();
    if (els.headerSearchInput) els.headerSearchInput.focus();
  } else if (event.key === "Escape") {
    if (state.userMenuOpen) closeUserMenu();
    else if (state.drawerOpen) closeModal();
  }
});

/* Header Search Live Filter */
if (els.headerSearchInput) {
  els.headerSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    if (state.activeView !== "jobs" && state.activeView !== "studio" && state.searchQuery.trim()) {
      state.activeView = "jobs";
    }
    render();
  });
}

/* Interactive Mouse Spotlight for Glass Cards (RA-AID Style) */
document.addEventListener("mousemove", (e) => {
  const cards = $$(".glass-card, .profile-section-card, .studio-card, .kpi-card, .dynamic-item-card, .kanban-card");
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    if (
      e.clientX >= rect.left - 60 &&
      e.clientX <= rect.right + 60 &&
      e.clientY >= rect.top - 60 &&
      e.clientY <= rect.bottom + 60
    ) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  });
});

(async function init() {
  await refreshAll({ renderAfter: false });
  render();
})();
