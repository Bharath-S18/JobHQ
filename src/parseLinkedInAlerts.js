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

const JUNK_TITLE_PATTERNS = [
  /help\s*page/i,
  /click\s*to\s*apply/i,
  /app\.joinsuperset/i,
  /view\s*all/i,
  /unsubscribe/i,
  /privacy\s*policy/i,
  /settings/i,
  /manage\s*alerts/i,
  /login/i,
  /dashboard/i,
  /support/i,
  /terms\s*of\s*service/i,
];

const JUNK_URL_PATTERNS = [
  /\/support/i,
  /\/students\/jobprofiles$/i,
  /\/settings/i,
  /\/unsubscribe/i,
  /\/privacy/i,
  /\/help/i,
  /joinsuperset\.com$/i,
];

function isJunkJob(title, url) {
  if (!title || title.length < 3) return true;
  if (!url || url.length < 10) return true;
  if (JUNK_TITLE_PATTERNS.some((p) => p.test(title))) return true;
  if (JUNK_URL_PATTERNS.some((p) => p.test(url))) return true;
  return false;
}

function cleanTitle(raw) {
  if (!raw) return "";
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s\n\r]+|[\s\n\r]+$/g, "")
    .replace(/\s*·\s*(LinkedIn|Superset|Naukri).*$/i, "")
    .replace(/^apply\s*(now|to|for)?\s*:?/i, "")
    .trim();
}

function parseLinkedInCard($, container) {
  const fullText = $(container).text().replace(/\s+/g, " ").trim();
  const lines = fullText.split(/[\n\r·•]/).map((l) => l.trim()).filter(Boolean);

  let company = "Target Company";
  let location = "Remote / Hybrid";

  if (lines.length >= 2 && lines[1].length < 60) {
    company = lines[1];
  }
  if (lines.length >= 3 && lines[2].length < 60) {
    location = lines[2];
  }

  return { company, location, context: fullText.slice(0, 400) };
}

function extractJobsFromHtml(html, senderEmail = "", subject = "") {
  const $ = cheerio.load(html);
  const jobs = [];
  const seenUrls = new Set();

  const isSuperset = senderEmail.includes("superset") || html.includes("joinsuperset.com") || subject.toLowerCase().includes("superset");

  // 1. Check for standard LinkedIn / Superset job links
  $('a[href*="/jobs/view/"], a[href*="redirect.linkedin.com"], a[href*="linkedin.com/comm/jobs"], a[href*="joinsuperset.com/students/jobprofiles/"]').each((_, el) => {
    const rawHref = $(el).attr("href");
    const titleText = $(el).text().trim();
    if (!rawHref || !titleText || titleText.length < 3) return;

    let cleanUrl = rawHref;
    if (cleanUrl.includes("?")) {
      const parts = cleanUrl.split("?");
      if (parts[0].includes("/jobs/view/") || parts[0].includes("jobprofiles/")) {
        cleanUrl = parts[0];
      }
    }

    const cleanedTitle = cleanTitle(titleText);
    if (isJunkJob(cleanedTitle, cleanUrl)) return;
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);

    const parentBox = $(el).closest("table, tr, td, div");
    const meta = parseLinkedInCard($, parentBox);

    jobs.push({
      title: cleanedTitle,
      url: cleanUrl,
      company: meta.company !== titleText ? meta.company : (isSuperset ? "Campus Partner" : "Company via Alert"),
      location: meta.location,
      context: meta.context,
      source: isSuperset ? "superset" : "gmail_alert",
    });
  });

  // 2. Intelligent Superset Email Body / Announcement Extractor
  if (isSuperset) {
    const bodyText = $.text().replace(/\s+/g, " ");
    // Pattern: "Job Profile: <Title> at <Company>" or "<Company>'s Job Profile: <Title>"
    const match = bodyText.match(/(?:for|at)\s+([A-Za-z0-9\s&.,-]+?)'?s?\s+Job Profile:?\s*([A-Za-z0-9\s/,-]+?)(?:\.|\n|New Deadline|Deadline|If you have)/i);
    if (match) {
      const company = match[1].trim();
      const rawTitles = match[2].trim();
      const firstTitle = rawTitles.split(/[,/]/)[0].trim();
      
      const applyLink = $("a[href*='joinsuperset.com']").first().attr("href") || "https://app.joinsuperset.com";

      if (firstTitle && !seenUrls.has(applyLink + "_" + firstTitle)) {
        seenUrls.add(applyLink + "_" + firstTitle);
        jobs.push({
          title: cleanTitle(firstTitle),
          company: company || "Campus Partner",
          location: "Campus / Hybrid",
          url: applyLink,
          context: bodyText.slice(0, 500),
          source: "superset",
        });
      }
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

      const jobs = extractJobsFromHtml(html, fromHeader, subjectHeader);
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
