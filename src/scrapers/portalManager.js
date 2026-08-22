import { scrapeLinkedInJobs } from "./linkedinScraper.js";
import { scrapeIndeedJobs } from "./indeedScraper.js";
import { scrapeNaukriJobs } from "./naukriScraper.js";
import { scrapeWellfoundJobs } from "./wellfoundScraper.js";
import { upsertJob, listJobs, updateJobMatch, getProfile } from "../db.js";
import { evaluate5DFit } from "../tailor.js";

/**
 * Unified Multi-Portal Job Scout Manager:
 * Runs concurrent scrapers across chosen platforms, normalizes schema,
 * deduplicates against SQLite, and runs 5D fit evaluation.
 */
export async function scoutAllPortals({
  portals = ["linkedin", "indeed", "naukri", "wellfound"],
  query = "Full Stack Engineer",
  location = "Bengaluru",
  limitPerPortal = 10,
} = {}) {
  const tasks = [];
  const portalCounts = {};

  if (portals.includes("linkedin")) {
    tasks.push(
      scrapeLinkedInJobs({ query, location, limit: limitPerPortal })
        .then((res) => {
          portalCounts.linkedin = res.length;
          return res;
        })
        .catch(() => [])
    );
  }

  if (portals.includes("indeed")) {
    tasks.push(
      scrapeIndeedJobs({ query, location, limit: limitPerPortal })
        .then((res) => {
          portalCounts.indeed = res.length;
          return res;
        })
        .catch(() => [])
    );
  }

  if (portals.includes("naukri")) {
    tasks.push(
      scrapeNaukriJobs({ query, location, limit: limitPerPortal })
        .then((res) => {
          portalCounts.naukri = res.length;
          return res;
        })
        .catch(() => [])
    );
  }

  if (portals.includes("wellfound")) {
    tasks.push(
      scrapeWellfoundJobs({ query, location, limit: limitPerPortal })
        .then((res) => {
          portalCounts.wellfound = res.length;
          return res;
        })
        .catch(() => [])
    );
  }

  const nestedResults = await Promise.all(tasks);
  const allDiscovered = nestedResults.flat();

  // Deduplicate and Ingest into SQLite
  const profile = getProfile();
  let newInserted = 0;
  const existingUrls = new Set(listJobs().map((j) => j.url));

  for (const job of allDiscovered) {
    if (!job.url || !job.title) continue;

    const isNew = !existingUrls.has(job.url);
    upsertJob({
      title: job.title,
      company: job.company,
      url: job.url,
      finalUrl: job.url,
      description: job.description,
      location: job.location,
      ats: job.ats || job.source || "direct",
      postedAt: job.postedAt,
      source: job.source,
      status: "new",
    });

    if (isNew) {
      newInserted++;
      existingUrls.add(job.url);
    }

    // Run 5D Fit Evaluation if candidate profile exists
    if (profile?.resume_text || profile?.structured) {
      const saved = listJobs().find((j) => j.url === job.url);
      if (saved && !saved.match_score) {
        try {
          const fitResult = await evaluate5DFit({
            resumeText: profile.resume_text,
            structured: profile.structured,
            jobTitle: saved.title,
            company: saved.company,
            jobDescription: saved.description,
          });
          updateJobMatch(saved.id, {
            score: fitResult.compositeScore,
            reason: fitResult.summary,
          });
        } catch (e) {}
      }
    }
  }

  return {
    ok: true,
    query,
    location,
    totalDiscovered: allDiscovered.length,
    newInserted,
    portalCounts,
    jobs: listJobs(),
  };
}
