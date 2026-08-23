import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Indeed & Global Public RSS Job Search Scraper
 * Extracts live job postings from Indeed RSS and developer job feeds.
 */
export async function scrapeIndeedJobs({ query = "Software Engineer", location = "India", limit = 10 } = {}) {
  try {
    const results = [];

    // 1. Primary: Query Indeed RSS XML feed
    try {
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

        $("item").each((_, el) => {
          if (results.length >= limit) return false;

          const title = $(el).find("title").text().trim();
          const link = $(el).find("link").text().trim();
          const description = $(el).find("description").text().trim();
          const pubDate = $(el).find("pubDate").text().trim();
          const sourceCompany = $(el).find("source").text().trim() || $(el).find("author").text().trim();

          let company = sourceCompany;
          let jobTitle = title;
          if (title.includes(" - ")) {
            const parts = title.split(" - ");
            jobTitle = parts[0].trim();
            company = parts[1]?.trim() || company;
          }

          if (jobTitle && link) {
            const plainDesc = cheerio.load(description).text().trim();
            results.push({
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
      }
    } catch (e) {}

    // 2. Secondary: Fallback to WeWorkRemotely public RSS if results are below limit
    if (results.length < limit) {
      try {
        const wwrRes = await fetch("https://weworkremotely.com/categories/remote-programming-jobs.rss", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        if (wwrRes.ok) {
          const xml = await wwrRes.text();
          const $ = cheerio.load(xml, { xmlMode: true });

          $("item").each((_, el) => {
            if (results.length >= limit) return false;
            const title = $(el).find("title").text().trim();
            const link = $(el).find("link").text().trim();
            const description = $(el).find("description").text().trim();
            const pubDate = $(el).find("pubDate").text().trim();

            let company = "Tech Company";
            let jobTitle = title;
            if (title.includes(": ")) {
              const parts = title.split(": ");
              company = parts[0].trim();
              jobTitle = parts.slice(1).join(": ").trim();
            }

            const qLower = query.toLowerCase();
            const matchesQuery = !query || jobTitle.toLowerCase().includes(qLower) || description.toLowerCase().includes(qLower);

            if (jobTitle && link && matchesQuery) {
              const plainDesc = cheerio.load(description).text().trim();
              results.push({
                title: jobTitle,
                company: company || "Indeed Partner",
                location: "Remote",
                url: link,
                source: "indeed",
                ats: "indeed",
                postedAt: pubDate || new Date().toISOString(),
                description: plainDesc.slice(0, 3000),
              });
            }
          });
        }
      } catch (e) {}
    }

    return results.slice(0, limit);
  } catch (err) {
    console.error("[Indeed Scraper Error]:", err.message);
    return [];
  }
}
