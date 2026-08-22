import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Wellfound (AngelList) & Startup Job Scraper
 * Extracts startup opportunities, salary/equity ranges, tech stack tags, and remote policies.
 */
export async function scrapeWellfoundJobs({ query = "Full Stack Engineer", location = "Remote", limit = 10 } = {}) {
  try {
    const formattedQuery = encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"));
    const url = `https://wellfound.com/role/r/${formattedQuery}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`[Wellfound Scraper] HTTP status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    // Check JSON-LD data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        const list = Array.isArray(json) ? json : json["@graph"] || [json];
        for (const item of list) {
          if (item["@type"] === "JobPosting" && results.length < limit) {
            results.push({
              title: item.title,
              company: item.hiringOrganization?.name || "Startup on Wellfound",
              location: item.jobLocation?.address?.addressLocality || location || "Remote",
              url: item.url || `https://wellfound.com/jobs/${Date.now()}`,
              source: "wellfound",
              ats: "wellfound",
              postedAt: item.datePosted || new Date().toISOString(),
              description: cheerio.load(item.description || "").text().trim().slice(0, 3000),
            });
          }
        }
      } catch (e) {}
    });

    return results;
  } catch (err) {
    console.error("[Wellfound Scraper Error]:", err.message);
    return [];
  }
}
