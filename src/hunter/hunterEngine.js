import { runScoutWorker } from "./scoutWorker.js";
import { runCollectorWorker } from "./collectorWorker.js";
import { runExtractorWorker } from "./extractorWorker.js";
import { runMatchWorker } from "./matchWorker.js";
import { runTailorWorker } from "./tailorWorker.js";
import {
  getProfile,
  getPendingTasks,
  upsertNormalizedJob,
  listHunterTasks,
  listAgentRuns,
  getJob,
  getJobMatch,
  getTailoredDocument,
  getApplicationEvents,
} from "../db.js";

/**
 * Executes one complete, deterministic pipeline cycle end-to-end:
 * Scout -> Collector -> Raw Staging -> Extractor -> 3-Tier Deduplication -> Matcher -> Selective Tailor -> Application Events
 */
export async function runHunterOnce({ maxItems = 6 } = {}) {
  const profile = getProfile();
  if (!profile) {
    throw new Error("Please save or upload your Master Profile before running the Job Hunter.");
  }

  // 1. Check if we need to generate new search tasks
  const pending = getPendingTasks(5);
  if (pending.length === 0) {
    console.log("[Hunter Engine] No pending tasks found. Triggering Scout Worker...");
    await runScoutWorker(profile);
  }

  // 2. Run Collector on next locked task (captures into raw_job_sources)
  console.log("[Hunter Engine] Running Collector Worker...");
  const collectRes = await runCollectorWorker({ maxItems });

  if (!collectRes.ok) {
    return {
      ok: false,
      error: collectRes.error || collectRes.message,
      challenge: collectRes.challenge || false,
    };
  }

  const rawSources = collectRes.rawSources || [];

  // 3. Run Extractor & Normalizer Worker on staged raw sources
  console.log(`[Hunter Engine] Extracting & normalizing ${rawSources.length} staged cards...`);
  const normalizedJobs = runExtractorWorker(rawSources);

  const processedJobs = [];

  // 4. Process, Deduplicate, Score, and selectively Tailor each job
  for (const jobObj of normalizedJobs) {
    // 3-Tier Deduplication & DB Upsert
    const { id: jobId, isNew } = upsertNormalizedJob(jobObj);
    const jobRecord = getJob(jobId);

    // 5. Run Match Worker (Detailed Breakdown)
    const matchRes = await runMatchWorker({ job: jobRecord, profile });

    // 6. Run Selective Tailor Worker (>=85% score threshold)
    const tailorRes = await runTailorWorker({
      job: jobRecord,
      profile,
      matchScore: matchRes.score,
    });

    const fullJob = getJob(jobId);
    const matchMeta = getJobMatch(jobId);
    const tailoredDoc = getTailoredDocument(jobId);
    const appEvents = getApplicationEvents(jobId);

    processedJobs.push({
      ...fullJob,
      isNew,
      match: matchMeta,
      tailoredDoc,
      events: appEvents,
    });
  }

  console.log(`[Hunter Engine] Completed hunter cycle! Ingested/Refreshed ${processedJobs.length} jobs.`);

  return {
    ok: true,
    taskId: collectRes.taskId,
    totalCollected: rawSources.length,
    newJobsCount: processedJobs.filter((j) => j.isNew).length,
    jobs: processedJobs,
  };
}

export function getHunterStatus() {
  const pendingTasks = getPendingTasks(10);
  const allTasks = listHunterTasks(15);
  const recentRuns = listAgentRuns(10);

  return {
    pendingTasksCount: pendingTasks.length,
    tasks: allTasks,
    recentRuns,
  };
}
