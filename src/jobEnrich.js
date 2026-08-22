import fetch from "node-fetch";
import * as cheerio from "cheerio";

// Detects whether a job's application flow is on a public, API-accessible
// ATS (Greenhouse or Lever) by resolving redirects and inspecting the
// final URL. LinkedIn "Easy Apply" jobs have no such API — those are
// flagged for manual review-and-submit instead.
export async function enrichJob(job) {
  try {
    const res = await fetch(job.url, { redirect: "follow" });
    const finalUrl = res.url;
    const html = await res.text();
    const $ = cheerio.load(html);

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $("body").text().slice(0, 2000);

    const company =
      $('meta[property="og:site_name"]').attr("content") ||
      job.context?.split("·")[0]?.trim() ||
      null;

    let ats = "linkedin";
    let atsSlug = null;

    if (finalUrl.includes("greenhouse.io")) {
      ats = "greenhouse";
      atsSlug = finalUrl.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    } else if (finalUrl.includes("lever.co")) {
      ats = "lever";
      atsSlug = finalUrl.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/);
    }

    return {
      ...job,
      finalUrl,
      company,
      description: description.slice(0, 3000),
      ats,
      atsBoard: atsSlug?.[1] || null,
      atsJobId: atsSlug?.[2] || null,
      // true only for ATS platforms with a real application API
      canAutoSubmit: ats === "greenhouse" || ats === "lever",
    };
  } catch (err) {
    return { ...job, enrichError: String(err), ats: "unknown", canAutoSubmit: false };
  }
}

// Greenhouse's public "Job Board API" — read-only, no auth needed for
// public postings: https://developers.greenhouse.io/job-board.html
export async function fetchGreenhouseJob(board, jobId) {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`
  );
  if (!res.ok) return null;
  return res.json();
}

// Lever's public postings API — read-only:
// https://github.com/lever/postings-api
export async function fetchLeverJob(board, jobId) {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${board}/${jobId}`
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Universal Direct Job URL Scraper:
 * Resolves job postings from arbitrary links, Greenhouse/Lever boards, and extracts
 * title, company, requirements, and clean description.
 */
export async function scrapeJobFromUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== "string") {
    throw new Error("Valid job URL is required");
  }

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL (HTTP ${res.status}): ${res.statusText}`);
  }

  const finalUrl = res.url || targetUrl;
  const html = await res.text();
  const $ = cheerio.load(html);

  // 1. Check for Greenhouse API
  const ghMatch = finalUrl.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
  if (ghMatch) {
    const board = ghMatch[1];
    const jobId = ghMatch[2];
    const ghData = await fetchGreenhouseJob(board, jobId);
    if (ghData) {
      const plainText = cheerio.load(ghData.content || "").text().trim();
      return {
        title: ghData.title,
        company: board.charAt(0).toUpperCase() + board.slice(1),
        url: targetUrl,
        finalUrl,
        description: plainText,
        location: ghData.location?.name || "Remote / Hybrid",
        ats: "greenhouse",
        atsBoard: board,
        atsJobId: jobId,
        canAutoSubmit: 1,
      };
    }
  }

  // 2. Check for Lever API
  const leverMatch = finalUrl.match(/jobs\.lever\.co\/([^/]+)\/([a-f0-9-]+)/);
  if (leverMatch) {
    const board = leverMatch[1];
    const jobId = leverMatch[2];
    const leverData = await fetchLeverJob(board, jobId);
    if (leverData) {
      const plainDesc = cheerio.load(leverData.descriptionPlain || leverData.description || "").text().trim();
      return {
        title: leverData.text,
        company: board.charAt(0).toUpperCase() + board.slice(1),
        url: targetUrl,
        finalUrl,
        description: plainDesc,
        location: leverData.categories?.location || "Remote / Hybrid",
        ats: "lever",
        atsBoard: board,
        atsJobId: jobId,
        canAutoSubmit: 1,
      };
    }
  }

  // 3. Schema.org JSON-LD JobPosting Extraction
  let jsonLdJob = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "{}");
      if (parsed["@type"] === "JobPosting") {
        jsonLdJob = parsed;
      } else if (Array.isArray(parsed["@graph"])) {
        const found = parsed["@graph"].find((item) => item["@type"] === "JobPosting");
        if (found) jsonLdJob = found;
      }
    } catch (e) {}
  });

  if (jsonLdJob) {
    const descText = cheerio.load(jsonLdJob.description || "").text().trim();
    return {
      title: jsonLdJob.title || $('h1').first().text().trim() || "Software Engineer",
      company: jsonLdJob.hiringOrganization?.name || $('meta[property="og:site_name"]').attr("content") || "Company",
      url: targetUrl,
      finalUrl,
      description: descText.slice(0, 5000),
      location: jsonLdJob.jobLocation?.address?.addressLocality || "Remote / Hybrid",
      ats: "direct",
      canAutoSubmit: 0,
    };
  }

  // 4. Fallback Cheerio HTML heuristics
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('h1').first().text().trim() ||
    $('title').text().split(/[-|•]/)[0].trim() ||
    "Software Opportunity";

  const company =
    $('meta[property="og:site_name"]').attr("content") ||
    $('meta[name="author"]').attr("content") ||
    "Direct Company";

  // Clean description: remove scripts, styles, navs
  $('script, style, noscript, nav, header, footer, svg').remove();
  let description = $('main, article, #job-description, .job-description, .description').text().trim();
  if (!description || description.length < 100) {
    description = $('body').text().trim();
  }

  // Normalize whitespace
  description = description.replace(/\s+/g, " ").slice(0, 4500);

  return {
    title: title.replace(/\s+/g, " ").trim(),
    company: company.replace(/\s+/g, " ").trim(),
    url: targetUrl,
    finalUrl,
    description,
    ats: "direct",
    canAutoSubmit: 0,
  };
}

