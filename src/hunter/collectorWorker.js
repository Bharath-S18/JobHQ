import puppeteer from "puppeteer";
import {
  lockNextHunterTask,
  completeHunterTask,
  failHunterTask,
  pauseHunterTask,
  insertRawJobSource,
  startAgentRun,
  finishAgentRun,
} from "../db.js";

/**
 * Collector Worker (Local Browser Worker)
 * Scrapes real-time LinkedIn job postings in a clean, isolated background browser session.
 * 100% lock-free: Never collides with other processes or userDataDir locks.
 */
export async function runCollectorWorker({ taskId = null, workerId = "local-collector-1", maxItems = 8 } = {}) {
  const runId = startAgentRun("collector");

  let task = null;
  if (taskId) {
    task = { id: taskId };
  } else {
    task = lockNextHunterTask(workerId);
  }

  if (!task) {
    finishAgentRun(runId, { status: "SUCCESS", itemsProcessed: 0 });
    return { ok: true, message: "No pending tasks in queue", rawSources: [] };
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    // Standard desktop user-agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    const targetUrl = task.search_url || `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(task.query)}&location=India&position=1&pageNum=0`;
    console.log(`[Collector Worker] Navigating to: ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 35000 });

    // Wait a moment for job card elements to render
    await new Promise((r) => setTimeout(r, 2500));

    const currentUrl = page.url();

    // Check if security challenge is present
    if (currentUrl.includes("/checkpoint/challenge/")) {
      console.warn("[Collector Worker] Security checkpoint challenge detected! Pausing task.");
      pauseHunterTask(task.id, "Security checkpoint challenge detected.");
      finishAgentRun(runId, {
        status: "PAUSED_CHALLENGE",
        itemsProcessed: 0,
        errorDetails: "Security checkpoint detected on LinkedIn.",
      });
      return { ok: false, challenge: true, message: "LinkedIn verification challenge detected." };
    }

    // Extract raw card HTML from the active page DOM
    const rawCardPayloads = await page.evaluate((limit) => {
      const payloads = [];
      const cards = document.querySelectorAll(
        ".base-card, .job-search-card, .job-card-container, .jobs-search__results-list li, .base-search-card, .jobs-search-results-list__list-item"
      );

      cards.forEach((card) => {
        if (payloads.length >= limit) return;

        const titleEl = card.querySelector("h3, .base-search-card__title, .job-card-list__title, a.base-card__full-link, .job-card-container__link");
        const linkEl = card.querySelector("a[href*='/jobs/view/'], a.base-card__full-link") || titleEl;
        const rawHref = linkEl ? linkEl.getAttribute("href") : "";
        if (!rawHref) return;

        let cleanUrl = rawHref.startsWith("http") ? rawHref : `https://www.linkedin.com${rawHref}`;
        cleanUrl = cleanUrl.split("?")[0];

        const title = titleEl ? titleEl.textContent.trim() : "";
        if (title && cleanUrl) {
          payloads.push({
            sourceUrl: cleanUrl,
            rawContent: card.outerHTML,
          });
        }
      });

      return payloads;
    }, maxItems);

    await browser.close();
    browser = null;

    // Stage into raw_job_sources table
    const stagedSources = [];
    for (const card of rawCardPayloads) {
      const staged = insertRawJobSource({
        taskId: task.id,
        source: "linkedin",
        sourceUrl: card.sourceUrl,
        rawContent: card.rawContent,
      });
      stagedSources.push({
        id: staged.id,
        task_id: task.id,
        source: "linkedin",
        source_url: card.sourceUrl,
        raw_content: card.rawContent,
        content_hash: staged.contentHash,
        collected_at: new Date().toISOString(),
      });
    }

    completeHunterTask(task.id);
    finishAgentRun(runId, {
      status: "SUCCESS",
      itemsProcessed: stagedSources.length,
    });

    console.log(`[Collector Worker] Staged ${stagedSources.length} raw cards into raw_job_sources from task #${task.id}`);
    return { ok: true, taskId: task.id, rawSources: stagedSources };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    failHunterTask(task.id, err.message);
    finishAgentRun(runId, {
      status: "FAILED",
      itemsProcessed: 0,
      errorDetails: err.message,
    });
    console.error("[Collector Worker Error]:", err.message);
    return { ok: false, error: err.message, rawSources: [] };
  }
}
