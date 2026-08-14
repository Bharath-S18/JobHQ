import * as cheerio from "cheerio";
import { markRawJobSourceParsed, startAgentRun, finishAgentRun } from "../db.js";

/**
 * Extractor & Normalizer Worker
 * Parses raw HTML / card payloads from raw_job_sources into standardized job objects
 * with rich filterable metadata (employment_type, experience_level, workplace_type).
 */
export function extractAndNormalizeRawSource(rawSource) {
  const html = rawSource.raw_content || "";
  let $ = null;
  try {
    $ = cheerio.load(html);
  } catch (e) {
    $ = null;
  }

  let title = "";
  let company = "";
  let location = "Remote / Hybrid";
  let url = rawSource.source_url || "";
  let sourceJobId = "";

  if ($) {
    title = $(
      ".job-card-list__title, .job-card-container__link, .base-search-card__title, h3, a[href*='/jobs/view/']"
    )
      .first()
      .text()
      .trim();

    company = $(
      ".job-card-container__company-name, .artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .base-search-card__subtitle, h4"
    )
      .first()
      .text()
      .trim();

    location = $(
      ".job-card-container__metadata-item, .artdeco-entity-lockup__caption, .job-search-card__location"
    )
      .first()
      .text()
      .trim() || "Remote / Hybrid";

    const linkEl = $("a[href*='/jobs/view/']").first();
    const href = linkEl.attr("href") || "";
    if (href) {
      url = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
    }

    sourceJobId =
      $("[data-job-id]").first().attr("data-job-id") ||
      $("[data-occludable-job-id]").first().attr("data-occludable-job-id") ||
      "";
  }

  // Fallback text parsing if cheerio failed or fields are empty
  if (!title) {
    const titleMatch = html.match(/class=["'][^"']*title[^"']*["'][^>]*>([^<]+)</i);
    if (titleMatch) title = titleMatch[1].trim();
  }
  if (!company) {
    const compMatch = html.match(/class=["'][^"']*(?:company|subtitle)[^"']*["'][^>]*>([^<]+)</i);
    if (compMatch) company = compMatch[1].trim();
  }

  // Clean and canonicalize URL
  url = url.split("?")[0];
  const canonicalUrl = url;

  if (!sourceJobId && url) {
    const match = url.match(/\/jobs\/view\/(\d+)/);
    if (match) sourceJobId = match[1];
  }

  const combinedText = `${title} ${company} ${location} ${html}`.toLowerCase();

  // Normalize Employment Type
  let employmentType = "fulltime";
  if (
    combinedText.includes("intern") ||
    combinedText.includes("internship") ||
    combinedText.includes("fresher") ||
    combinedText.includes("trainee")
  ) {
    employmentType = "internship";
  } else if (combinedText.includes("contract") || combinedText.includes("freelance")) {
    employmentType = "contract";
  }

  // Normalize Experience Level
  let experienceLevel = "entry";
  if (combinedText.includes("senior") || combinedText.includes("lead") || combinedText.includes("principal")) {
    experienceLevel = "senior";
  } else if (combinedText.includes("mid") || combinedText.includes("3-5 years") || combinedText.includes("3+ years")) {
    experienceLevel = "mid";
  }

  // Normalize Workplace Type
  let workplaceType = "hybrid";
  if (combinedText.includes("remote") || combinedText.includes("work from home")) {
    workplaceType = "remote";
  } else if (combinedText.includes("on-site") || combinedText.includes("onsite") || combinedText.includes("in-office")) {
    workplaceType = "onsite";
  }

  // Normalize ATS identification
  let ats = "direct";
  if (url.includes("greenhouse.io")) ats = "greenhouse";
  else if (url.includes("lever.co")) ats = "lever";
  else if (url.includes("linkedin.com")) ats = "linkedin";

  markRawJobSourceParsed(rawSource.id);

  return {
    source: rawSource.source || "linkedin",
    sourceJobId: sourceJobId || `src_${rawSource.id}`,
    url: url || rawSource.source_url,
    canonicalUrl,
    title: title || "Discovered Opportunity",
    company: company || "Company via LinkedIn",
    location: location || "Remote / Hybrid",
    description: `${title} at ${company || "Company"}. Location: ${location}.\nDiscovered via local LinkedIn Hunter.`,
    employmentType,
    experienceLevel,
    workplaceType,
    ats,
    applicationUrl: url || rawSource.source_url,
    postedAt: rawSource.collected_at || new Date().toISOString(),
  };
}

export function runExtractorWorker(rawSources = []) {
  const runId = startAgentRun("extractor");
  try {
    const normalizedJobs = [];
    for (const raw of rawSources) {
      const job = extractAndNormalizeRawSource(raw);
      if (job.title && job.url) {
        normalizedJobs.push(job);
      }
    }

    finishAgentRun(runId, { status: "SUCCESS", itemsProcessed: normalizedJobs.length });
    return normalizedJobs;
  } catch (err) {
    finishAgentRun(runId, { status: "FAILED", itemsProcessed: 0, errorDetails: err.message });
    throw err;
  }
}
