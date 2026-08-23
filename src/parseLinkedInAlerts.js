import { google } from "googleapis";
import * as cheerio from "cheerio";

// Scans for LinkedIn job alert emails and Superset college placement/internship notifications from the last 2 days (48 hours)
const GMAIL_QUERY = 'from:(jobalerts-noreply@linkedin.com OR jobs-noreply@linkedin.com OR joinsuperset.com OR superset) newer_than:2d';

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
  /view\s*job/i,
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
    .replace(/Easy Apply/gi, "")
    .trim();
}

function parseLinkedInCard($, container) {
  const fullText = $(container).text().replace(/\s+/g, " ").trim();
  const lines = fullText.split(/[\n\r·•]/).map((l) => l.trim()).filter(Boolean);

  let company = "Company on LinkedIn";
  let location = "Remote / Hybrid";

  if (lines.length >= 2 && lines[1].length < 60) {
    company = lines[1].replace(/Easy Apply/gi, "").trim();
  }
  if (lines.length >= 3 && lines[2].length < 60) {
    location = lines[2].replace(/Easy Apply/gi, "").trim();
  }

  return { company, location, context: fullText.slice(0, 400) };
}

function extractDeadline(text) {
  if (!text) return null;
  const match = text.match(/(?:new\s+deadline|deadline|apply\s+before|last\s+date\s*(?:to\s*apply)?)\s*:?\s*([A-Za-z0-9\s,:\/-]{3,35})/i);
  if (match) {
    let raw = match[1].trim();
    raw = raw.replace(/\s+(?:If you have|To check|Please note|Click here|For any help).*$/i, '').trim();
    if (raw.length >= 3 && raw.length <= 35) {
      return raw;
    }
  }
  return null;
}

export function isDeadlineExpired(deadlineStr) {
  if (!deadlineStr) return false;
  try {
    const currentYear = new Date().getFullYear();
    let clean = deadlineStr.replace(/^(?:new\s+deadline|deadline|apply\s+before|last\s+date\s*(?:to\s*apply)?)\s*:?\s*/i, '').trim();
    if (!/\b(202\d)\b/.test(clean)) {
      clean = `${clean}, ${currentYear}`;
    }
    const parsed = Date.parse(clean);
    if (!isNaN(parsed)) {
      return parsed < Date.now();
    }
  } catch (e) {}
  return false;
}

function extractJobsFromHtml(html, senderEmail = "", subject = "") {
  const $ = cheerio.load(html);
  const jobs = [];
  const seenUrls = new Set();
  const rawBodyText = $.text().replace(/\s+/g, " ").trim();
  const emailDeadline = extractDeadline(rawBodyText || subject);

  const isSuperset = senderEmail.toLowerCase().includes("superset") || html.toLowerCase().includes("joinsuperset.com") || subject.toLowerCase().includes("superset");
  const isLinkedInAlert = senderEmail.toLowerCase().includes("linkedin.com") || subject.toLowerCase().includes("job alert");

  const sourceTag = isSuperset ? "superset" : isLinkedInAlert ? "linkedin_alert" : "gmail_alert";

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
    const cardDeadline = extractDeadline(meta.context) || emailDeadline;
    const isExpired = isDeadlineExpired(cardDeadline);

    // Extract better company if email mentions it
    let resolvedCompany = meta.company;
    if (isSuperset) {
      const compMatch = rawBodyText.match(/(?:from|for|at)\s+([A-Za-z0-9\s&.,-]+?)(?:!|'s\s+Job Profile|'s\s+Job)/i);
      if (compMatch && compMatch[1].length < 50 && !compMatch[1].toLowerCase().includes("document")) {
        resolvedCompany = compMatch[1].trim();
      } else if (!resolvedCompany || resolvedCompany === "Company on LinkedIn") {
        resolvedCompany = "Campus Placement Partner";
      }
    }

    jobs.push({
      title: cleanedTitle,
      url: cleanUrl,
      company: resolvedCompany !== titleText && resolvedCompany !== "Company on LinkedIn" ? resolvedCompany : (isSuperset ? "Campus Placement Partner" : "Company via LinkedIn Alert"),
      location: meta.location,
      context: meta.context,
      source: sourceTag,
      deadline: cardDeadline,
      status: isExpired ? "closed" : "new",
      isActive: isExpired ? 0 : 1,
    });
  });

  // 2. Intelligent Superset Email Body / Announcement Extractor
  if (isSuperset) {
    const compMatch = rawBodyText.match(/(?:from|for|at)\s+([A-Za-z0-9\s&.,-]+?)(?:!|'s\s+Job Profile|'s\s+Job)/i);
    const titleMatch = rawBodyText.match(/Job Profile\s*[:-]?\s*([A-Za-z0-9\s/,-]+?)(?:\s+in\s+CTC|\.|\n|Deadline|Click to Apply)/i);

    const company = compMatch && compMatch[1].length < 50 && !compMatch[1].toLowerCase().includes("document") ? compMatch[1].trim() : "Campus Placement Partner";
    const rawTitle = titleMatch ? titleMatch[1].trim() : "";

    if (rawTitle) {
      const applyLink = $("a[href*='joinsuperset.com']").first().attr("href") || "https://app.joinsuperset.com";
      const isExpired = isDeadlineExpired(emailDeadline);

      if (!seenUrls.has(applyLink + "_" + rawTitle)) {
        seenUrls.add(applyLink + "_" + rawTitle);
        jobs.push({
          title: cleanTitle(rawTitle),
          company: company,
          location: "Campus / Hybrid",
          url: applyLink,
          context: rawBodyText.slice(0, 500),
          source: "superset",
          deadline: emailDeadline,
          status: isExpired ? "closed" : "new",
          isActive: isExpired ? 0 : 1,
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

      const internalDate = Number(msg.data.internalDate);
      const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
      if (internalDate && internalDate < fortyEightHoursAgo) {
        continue; // Strictly ignore emails older than 48 hours
      }

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
