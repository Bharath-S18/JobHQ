import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Naukri Job Search Scraper
 * Extracts live job postings from Naukri's search catalog & regional feeds.
 */
export async function scrapeNaukriJobs({ query = "React Developer", location = "Bengaluru", limit = 10 } = {}) {
  try {
    const results = [];
    const formattedQuery = encodeURIComponent(query.replace(/\s+/g, "-").toLowerCase());
    const formattedLocation = encodeURIComponent(location.replace(/\s+/g, "-").toLowerCase());
    const searchUrl = `https://www.naukri.com/${formattedQuery}-jobs-in-${formattedLocation}`;

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        // Check for JSON-LD schema or standard job tuples
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const json = JSON.parse($(el).html() || "{}");
            const list = Array.isArray(json) ? json : json["@graph"] || [json];
            for (const item of list) {
              if (item["@type"] === "JobPosting" && results.length < limit) {
                results.push({
                  title: item.title,
                  company: item.hiringOrganization?.name || "Naukri Verified Employer",
                  location: item.jobLocation?.address?.addressLocality || location,
                  url: item.url || `https://www.naukri.com/job-listings-${Date.now()}`,
                  source: "naukri",
                  ats: "naukri",
                  postedAt: item.datePosted || new Date().toISOString(),
                  description: cheerio.load(item.description || "").text().trim().slice(0, 3000),
                });
              }
            }
          } catch (e) {}
        });

        // Fallback Cheerio HTML card selectors
        if (results.length === 0) {
          $(".srp-jobtuple-wrapper, .cust-job-tuple, .jobTuple").each((_, el) => {
            if (results.length >= limit) return false;

            const title = $(el).find(".title, .job-title, a.title").text().trim();
            const company = $(el).find(".comp-name, .companyInfo a").text().trim();
            const exp = $(el).find(".exp-wrap, .experience").text().trim();
            const loc = $(el).find(".loc-wrap, .location").text().trim();
            const link = $(el).find("a.title").attr("href");
            const desc = $(el).find(".job-desc, .job-description").text().trim();

            if (title) {
              results.push({
                title,
                company: company || "Employer on Naukri",
                location: loc || location,
                url: link || `https://www.naukri.com/job-${Date.now()}`,
                source: "naukri",
                ats: "naukri",
                postedAt: new Date().toISOString(),
                description: desc ? `${desc} (Experience required: ${exp || "Entry/Mid"})` : `Job opportunity for ${title} at ${company || "Company"}.`,
              });
            }
          });
        }
      }
    } catch (e) {}

    return results.slice(0, limit);
  } catch (err) {
    console.error("[Naukri Scraper Error]:", err.message);
    return [];
  }
}
