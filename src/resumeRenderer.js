export function renderResumeHtml(profile = {}) {
  const p = profile || {};
  const pi = p.personalInfo || {};
  const skills = p.skills || {};
  const edu = Array.isArray(p.education) ? p.education : [];
  const projects = Array.isArray(p.projects) ? p.projects : [];
  const certs = Array.isArray(p.certifications) ? p.certifications : [];
  const achievements = Array.isArray(p.achievements) ? p.achievements : [];

  const fullName = pi.fullName || "Candidate Resume";
  const email = pi.email || "";
  const phone = pi.phone || "";
  const location = pi.location || "";
  const github = pi.github || "";
  const linkedin = pi.linkedin || "";
  const leetcode = pi.leetcode || "";
  const portfolio = pi.portfolio || "";
  const summary = p.summary || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullName)} — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      background: #373b44;
      min-height: 100%;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #373b44;
      color: #111827;
      line-height: 1.5;
      padding: 24px 16px;
      font-size: 13px;
      display: flex;
      justify-content: center;
    }
    .paper {
      background: #ffffff !important;
      color: #111827 !important;
      max-width: 820px;
      width: 100%;
      min-height: 1050px;
      padding: 44px 48px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
      border-radius: 4px;
    }
    @media print {
      html, body {
        background: #fff !important;
        padding: 0 !important;
      }
      .paper {
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      a { text-decoration: none; color: #000 !important; }
    }
    .header {
      text-align: center;
      margin-bottom: 22px;
      border-bottom: 2px solid #111827;
      padding-bottom: 16px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      color: #111827;
      text-transform: uppercase;
    }
    .header .contact-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 14px;
      font-size: 12px;
      color: #4b5563;
      font-weight: 500;
    }
    .header .contact-row a {
      color: #1d4ed8;
      text-decoration: none;
      font-weight: 600;
    }
    .header .contact-row a:hover {
      text-decoration: underline;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #111827;
      border-bottom: 1.5px solid #d1d5db;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .summary-text {
      color: #374151;
      line-height: 1.6;
      font-size: 12.5px;
      text-align: justify;
    }
    .skill-category {
      margin-bottom: 6px;
      display: flex;
      gap: 8px;
      font-size: 12.5px;
    }
    .skill-label {
      font-weight: 700;
      color: #111827;
      min-width: 165px;
    }
    .skill-values {
      color: #374151;
      flex: 1;
    }
    .item {
      margin-bottom: 14px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .item-title {
      font-weight: 700;
      font-size: 13.5px;
      color: #111827;
    }
    .item-sub {
      color: #4b5563;
      font-size: 12.5px;
    }
    .item-date {
      font-size: 12px;
      font-weight: 600;
      color: #4b5563;
      font-family: 'Geist Mono', monospace;
    }
    .item-bullets {
      list-style-type: square;
      padding-left: 18px;
      margin-top: 5px;
      color: #374151;
      font-size: 12.5px;
      line-height: 1.55;
    }
    .item-bullets li {
      margin-bottom: 3px;
    }
    .item-bullets strong {
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="paper">
    <header class="header">
      <h1>${escapeHtml(fullName)}</h1>
      <div class="contact-row">
        ${location ? `<span>📍 ${escapeHtml(location)}</span>` : ""}
        ${phone ? `<span>📞 ${escapeHtml(phone)}</span>` : ""}
        ${email ? `<span>✉️ <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></span>` : ""}
        ${github ? `<span>💻 <a href="${escapeHtml(github)}" target="_blank">GitHub</a></span>` : ""}
        ${linkedin ? `<span>💼 <a href="${escapeHtml(linkedin)}" target="_blank">LinkedIn</a></span>` : ""}
        ${leetcode ? `<span>⚡ <a href="${escapeHtml(leetcode)}" target="_blank">LeetCode</a></span>` : ""}
        ${portfolio ? `<span>🌐 <a href="${escapeHtml(portfolio)}" target="_blank">Portfolio</a></span>` : ""}
      </div>
    </header>

    ${
      summary
        ? `
      <!-- Professional Summary -->
      <section class="section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary-text">${escapeHtml(summary)}</p>
      </section>
    `
        : ""
    }

    ${
      Object.keys(skills).some((k) => Array.isArray(skills[k]) && skills[k].length > 0)
        ? `
      <!-- Technical Skills -->
      <section class="section">
        <h2 class="section-title">Technical Skills</h2>
        ${Object.entries({
          programming: "Programming Languages",
          frontend: "Frontend Technologies",
          backend: "Backend & Frameworks",
          databases: "Databases",
          ai_ml: "AI & Data Tools",
          tools: "Developer Tools & Cloud",
        })
          .map(([key, label]) => {
            const list = skills[key] || [];
            if (!list.length) return "";
            return `
              <div class="skill-category">
                <span class="skill-label">${label}:</span>
                <span class="skill-values">${escapeHtml(list.join(", "))}</span>
              </div>
            `;
          })
          .join("")}
      </section>
    `
        : ""
    }

    ${
      projects.length
        ? `
      <!-- Key Projects -->
      <section class="section">
        <h2 class="section-title">Key Projects</h2>
        ${projects
          .map(
            (proj) => `
          <div class="item">
            <div class="item-header">
              <div>
                <span class="item-title">${escapeHtml(proj.name)}</span>
                ${proj.technologies ? `<span class="item-sub"> — <em>${escapeHtml(proj.technologies)}</em></span>` : ""}
              </div>
              ${proj.githubUrl ? `<a href="${escapeHtml(proj.githubUrl)}" target="_blank" style="font-size:11px; color:#1d4ed8; font-weight:600;">View Code</a>` : ""}
            </div>
            <ul class="item-bullets">
              ${proj.description ? `<li>${escapeHtml(proj.description)}</li>` : ""}
              ${proj.keyContributions ? `<li>${escapeHtml(proj.keyContributions).replace(/\n/g, "<br/>")}</li>` : ""}
            </ul>
          </div>
        `
          )
          .join("")}
      </section>
    `
        : ""
    }

    ${
      edu.length
        ? `
      <!-- Education -->
      <section class="section">
        <h2 class="section-title">Education</h2>
        ${edu
          .map(
            (e) => `
          <div class="item">
            <div class="item-header">
              <span class="item-title">${escapeHtml(e.institution || e.degree)}</span>
              ${e.startDate || e.endDate ? `<span class="item-date">${escapeHtml(e.startDate || "")} – ${escapeHtml(e.endDate || "Present")}</span>` : ""}
            </div>
            <div class="item-sub">${escapeHtml(e.degree || "")}${e.grade ? ` · <strong>${escapeHtml(e.grade)}</strong>` : ""}</div>
            ${e.coursework ? `<div style="font-size:11.5px; color:#4b5563; margin-top:2px;">Coursework: ${escapeHtml(e.coursework)}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </section>
    `
        : ""
    }

    ${
      certs.length || achievements.length
        ? `
      <section class="section">
        <h2 class="section-title">Certifications &amp; Achievements</h2>
        <ul class="item-bullets">
          ${certs.map((c) => `<li><strong>${escapeHtml(c.name)}</strong>${c.issuer ? ` — ${escapeHtml(c.issuer)}` : ""}${c.issueDate ? ` (${escapeHtml(c.issueDate)})` : ""}</li>`).join("")}
          ${achievements.map((a) => `<li><strong>${escapeHtml(a.title)}</strong>${a.description ? ` — ${escapeHtml(a.description)}` : ""}${a.date ? ` (${escapeHtml(a.date)})` : ""}</li>`).join("")}
        </ul>
      </section>
    `
        : ""
    }
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
