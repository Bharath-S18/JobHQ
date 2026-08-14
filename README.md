# JobHQ 🎯

An autonomous, multi-source job intelligence system, applicant tracking dashboard, and AI-powered resume customization platform.

JobHQ automates and simplifies job search workflows: from synchronizing campus & job alerts directly from your Gmail inbox (Superset, LinkedIn alerts), executing scheduled autonomous LinkedIn scouting runs with browser automation, to parsing your PDF resume into a structured Master Profile and tailoring your resume and cover letter for any job.

---

## ✨ Features

- **📬 Direct Gmail Alert Sync**:
  - Securely authenticate via Google OAuth.
  - Automatically scan and parse incoming campus placement alerts (e.g. Superset notifications) and LinkedIn job alert emails with full HTML decomposition.
- **⚡ Autonomous Hunter Engine**:
  - 5-stage pipeline: **Scout $\rightarrow$ Collector $\rightarrow$ Extractor $\rightarrow$ Match $\rightarrow$ Tailor**.
  - Headless/visible Chromium session manager with rate-limit evasion, realistic jitter, and automated session cookie retention.
  - Staging store architecture ensuring robust extraction and continuous telemetry logs.
- **📄 Pure Resume Parser & Live Document Viewer**:
  - High-precision PDF parser extracting personal info, education, skills, projects, and certifications without mock data or assumptions.
  - Side-by-side split screen view with live PDF document rendering and extracted section editing.
- **🧠 AI Resume Tailoring & Fit Scoring**:
  - Automatically computes candidate-to-job match scores based on hard/soft skills and requirement alignment.
  - Generates role-specific tailored bullet points and customized cover letters ready for one-click download.
- **📊 Real-Time Analytics & Application Pipeline**:
  - Kanban board and table views tracking statuses: *Staged*, *Reviewing*, *Applied*, *Interviewing*, *Offered*, and *Archived*.
  - Full analytics tracking match distribution and application velocity.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Google Cloud Console Project** with Gmail API enabled (optional, for Gmail Sync)
- **Gemini API Key** (for AI match scoring and tailoring)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Bharath-S18/JobHQ.git
cd JobHQ

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file from the provided example:

```bash
cp .env.example .env
```

Populate the keys in `.env`:
```env
PORT=3000

# Google OAuth (for Gmail Alert Sync)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Gemini AI (for Match Scoring & Resume Tailoring)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Application

```bash
npm start
```

Access the dashboard at **[http://localhost:3000](http://localhost:3000)**.

---

## 🛠️ Architecture & Project Structure

```
JobHQ/
├── public/                  # Frontend UI (Vanilla JS, Modern Glassmorphism CSS)
│   ├── app.js               # Reactive Single Page Application & Event Handlers
│   ├── index.html           # Core HTML shell & navigation
│   └── style.css            # Responsive Design System, Tokens, & Theme Styles
├── src/
│   ├── db.js                # SQLite Database schema, migrations, & queries
│   ├── gmailAuth.js         # Google OAuth2 client & Gmail message scanner
│   ├── parseLinkedInAlerts.js # HTML email parsing & Superset extraction
│   ├── resume_parser.js     # High-precision PDF parser & text extractor
│   ├── resumeRenderer.js    # PDF & HTML document generation engine
│   ├── tailor.js            # Gemini AI tailoring & match scoring engine
│   └── hunter/              # Autonomous Hunter Subsystem
│       ├── browserSession.js # Puppeteer session & browser pool manager
│       ├── hunterEngine.js   # Hunter scheduler & orchestration pipeline
│       ├── collectorWorker.js # Stage 1: Card harvesting & staging
│       ├── extractorWorker.js # Stage 2: Full job description extraction
│       └── matchWorker.js    # Stage 3: Candidate fit calculation
├── server.js                # Express REST API Server & background workers
├── package.json             # Project dependencies & scripts
└── README.md                # Project documentation
```

---

## 🔒 Security & Privacy

- All application data, tokens, and resumes remain local on your machine in the SQLite database (`data/jobs.db`).
- Secrets and tokens are excluded from version control via `.gitignore`.
- OAuth tokens are kept in encrypted local storage and refreshed automatically.

---

## 📄 License

MIT License. Built with passion by [Bharath S](https://github.com/Bharath-S18).
