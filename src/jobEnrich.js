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
