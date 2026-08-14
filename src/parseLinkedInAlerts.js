import { google } from "googleapis";
import * as cheerio from "cheerio";

// Scans for LinkedIn job alert emails and Superset college placement/internship notifications
const GMAIL_QUERY = 'from:(jobs-noreply@linkedin.com OR joinsuperset.com OR superset OR naukri.com OR internshala.com) newer_than:30d';

function decodeBody(payload) {
  function walk(part) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.parts) {
      for (const p of part.parts) {
        const found = walk(p);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(payload) || "";
}

function cleanTitle(raw) {
  if (!raw) return "Software Engineering Role";
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s\n\r]+|[\s\n\r]+$/g, "")
    .replace(/\s*·\s*(LinkedIn|Superset|Naukri).*$/i, "")
    .trim();
}

function parseLinkedInCard($, container) {
  const fullText = $(container).text().replace(/\s+/g, " ").trim();
  const lines = fullText.split(/[\n\r·•]/).map((l) => l.trim()).filter(Boolean);

  let company = "Target Company";
  let location = "Remote / Hybrid";

  if (lines.length >= 2) {
    company = lines[1];
  }
  if (lines.length >= 3) {
    location = lines[2];
  }

  return { company, location, context: fullText.slice(0, 400) };
}

function extractJobsFromHtml(html, senderEmail = "") {
  const $ = cheerio.load(html);
  const jobs = [];
  const seenUrls = new Set();

  const isSuperset = senderEmail.includes("superset") || html.includes("joinsuperset.com");

  // 1. Check for standard LinkedIn / Superset / Job links
  $('a[href*="/jobs/view/"], a[href*="redirect.linkedin.com"], a[href*="linkedin.com/comm/jobs"], a[href*="joinsuperset.com"], a[href*="job_profile"]').each((_, el) => {
    const rawHref = $(el).attr("href");
    const titleText = $(el).text().trim();
    if (!rawHref || !titleText || titleText.length < 3) return;

    if (/view\s*all|unsubscribe|settings|manage\s*alerts|privacy|login|dashboard/i.test(titleText)) return;

    let cleanUrl = rawHref;
    if (cleanUrl.includes("?")) {
      const parts = cleanUrl.split("?");
      if (parts[0].includes("/jobs/view/") || parts[0].includes("joinsuperset.com")) {
        cleanUrl = parts[0];
      }
    }

    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);

    const parentBox = $(el).closest("table, tr, td, div");
    const meta = parseLinkedInCard($, parentBox);

    jobs.push({
      title: cleanTitle(titleText),
      url: cleanUrl,
      company: meta.company !== titleText ? meta.company : (isSuperset ? "Campus Recruiter via Superset" : "Company via Alert"),
      location: meta.location,
      context: meta.context,
      source: isSuperset ? "superset" : "gmail_alert",
    });
  });

  // 2. Fallback for Superset structured announcement headers
  if (jobs.length === 0 && isSuperset) {
    const heading = $("h1, h2, h3, .job-title").first().text().trim();
    const comp = $(".company-name, .recruiter").first().text().trim() || "Campus Partner via Superset";
    const applyLink = $("a[href*='http']").first().attr("href");

    if (heading && applyLink) {
      jobs.push({
        title: cleanTitle(heading),
        url: applyLink,
        company: comp,
        location: "Campus / Hybrid",
        context: $.text().slice(0, 400),
        source: "superset",
      });
    }
  }

  return jobs;
}

export async function fetchLinkedInJobAlerts(authClient, { maxResults = 30 } = {}) {
  const gmail = google.gmail({ version: "v1", auth: authClient });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: GMAIL_QUERY,
    maxResults,
  });

  const messages = list.data.messages || [];
  const allJobs = [];

  for (const m of messages) {
    try {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: m.id,
        format: "full",
      });

      const headers = msg.data.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";

      const html = decodeBody(msg.data.payload);
      if (!html) continue;

      const jobs = extractJobsFromHtml(html, fromHeader);
      for (const job of jobs) {
        allJobs.push({
          ...job,
          emailSubject: subjectHeader,
          emailFrom: fromHeader,
          gmailMessageId: m.id,
          receivedAt: msg.data.internalDate ? new Date(Number(msg.data.internalDate)).toISOString() : new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`[Gmail Ingest] Error reading message ${m.id}:`, err.message);
    }
  }

  return allJobs;
}
