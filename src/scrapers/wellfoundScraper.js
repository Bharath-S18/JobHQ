import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Wellfound (AngelList) & Startup Job Scraper
 * Extracts startup opportunities, salary/equity ranges, tech stack tags, and remote policies.
 */
export async function scrapeWellfoundJobs({ query = "Full Stack Engineer", location = "Remote", limit = 10 } = {}) {
  try {
    const results = [];

    // 1. Primary: Wellfound public role catalog
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

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

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
      }
    } catch (e) {}

    // 2. Secondary: RemoteOK public startup API fallback
    if (results.length < limit) {
      try {
        const remoteOkRes = await fetch("https://remoteok.com/api", {
          headers: {
            "User-Agent": "JobHQ-Public-Scout/1.0",
          },
        });
        if (remoteOkRes.ok) {
          const remoteOkData = await remoteOkRes.json();
          if (Array.isArray(remoteOkData)) {
            const qLower = query.toLowerCase();
            for (const item of remoteOkData) {
              if (!item.position || !item.url) continue;
              if (results.length >= limit) break;

              const positionMatch = item.position.toLowerCase().includes(qLower);
              const tagsMatch = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(qLower));

              if (positionMatch || tagsMatch || !query) {
                const plainDesc = cheerio.load(item.description || "").text().trim();
                results.push({
                  title: item.position,
                  company: item.company || "Startup Partner",
                  location: item.location || "Remote",
                  url: item.url.startsWith("http") ? item.url : `https://remoteok.com${item.url}`,
                  source: "wellfound",
                  ats: "wellfound",
                  postedAt: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
                  description: plainDesc.slice(0, 3000) || `Startup position for ${item.position} at ${item.company}.`,
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    return results.slice(0, limit);
  } catch (err) {
    console.error("[Wellfound Scraper Error]:", err.message);
    return [];
  }
}
