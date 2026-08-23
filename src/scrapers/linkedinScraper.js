import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * LinkedIn Public Guest Job Scraper
 * Searches live public job postings on LinkedIn without requiring private user credentials.
 */
function isWithin2Days(timeStr) {
  if (!timeStr) return true;
  const s = timeStr.toLowerCase().trim();
  // Reject anything older than 2 days (months, years, weeks, or > 2 days)
  if (s.includes("month") || s.includes("year") || s.includes("week")) return false;
  const dayMatch = s.match(/(\d+)\s*day/);
  if (dayMatch && parseInt(dayMatch[1], 10) > 2) return false;
  return true;
}

export async function scrapeLinkedInJobs({ query = "Software Engineer", location = "India", limit = 10 } = {}) {
  try {
    // sortBy=DD sorts by most recent; f_TPR=r172800 limits search strictly to past 48 hours (2 days)
    const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&sortBy=DD&f_TPR=r172800&start=0`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      console.warn(`[LinkedIn Scraper] HTTP status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $("li").each((_, el) => {
      if (results.length >= limit) return false;

      const title = $(el).find(".base-search-card__title, .job-search-card__title").text().trim();
      const company = $(el).find(".base-search-card__subtitle, .job-search-card__subtitle a").text().trim();
      const jobLocation = $(el).find(".job-search-card__location").text().trim();
      const link = $(el).find("a.base-card__full-link, a.job-search-card__url-link").attr("href");
      const postedAt = $(el).find("time").attr("datetime") || $(el).find("time").text().trim();

      // Enforce strict 2-day limit: Reject anything older than 2 days
      if (postedAt && !isWithin2Days(postedAt)) {
        return;
      }

      if (title && (link || company)) {
        const cleanUrl = link ? link.split("?")[0] : "";
        results.push({
          title,
          company: company || "Company on LinkedIn",
          location: jobLocation || location,
          url: cleanUrl || `https://www.linkedin.com/jobs/view/${Date.now()}`,
          source: "linkedin",
          ats: "linkedin",
          postedAt: postedAt || new Date().toISOString(),
          description: `Role: ${title} at ${company || "Company"}. Location: ${jobLocation || location}. Discovered via LinkedIn Job Search. Posted: ${postedAt || 'Recently'}.`,
        });
      }
    });

    return results;
  } catch (err) {
    console.error("[LinkedIn Scraper Error]:", err.message);
    return [];
  }
}
