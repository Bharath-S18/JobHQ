import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Indeed Public Job Search Scraper
 * Extracts live job postings from Indeed via RSS feed and public search endpoints.
 */
export async function scrapeIndeedJobs({ query = "Software Engineer", location = "India", limit = 10 } = {}) {
  try {
    // 1. Primary: Query Indeed RSS XML feed (clean, zero bot-blocking)
    const rssUrl = `https://www.indeed.com/rss?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (res.ok) {
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = [];

      $("item").each((_, el) => {
        if (items.length >= limit) return false;

        const title = $(el).find("title").text().trim();
        const link = $(el).find("link").text().trim();
        const description = $(el).find("description").text().trim();
        const pubDate = $(el).find("pubDate").text().trim();
        const sourceCompany = $(el).find("source").text().trim() || $(el).find("author").text().trim();

        // Extract company from title if "Role - Company - Location" format
        let company = sourceCompany;
        let jobTitle = title;
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          jobTitle = parts[0].trim();
          company = parts[1]?.trim() || company;
        }

        if (jobTitle && link) {
          // Clean HTML tags from description
          const plainDesc = cheerio.load(description).text().trim();
          items.push({
            title: jobTitle,
            company: company || "Company on Indeed",
            location: location || "Remote / Onsite",
            url: link.split("?")[0] || link,
            source: "indeed",
            ats: "indeed",
            postedAt: pubDate || new Date().toISOString(),
            description: plainDesc || `Position: ${jobTitle} at ${company || "Company"}. Found via Indeed.`,
          });
        }
      });

      if (items.length > 0) return items;
    }

    return [];
  } catch (err) {
    console.error("[Indeed Scraper Error]:", err.message);
    return [];
  }
}
