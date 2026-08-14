import { insertHunterTask, startAgentRun, finishAgentRun } from "../db.js";

/**
 * Scout Worker (Deterministic Query Generator)
 * Builds a controlled, non-exploding set of high-priority search tasks
 * directly from the candidate's Master Profile.
 */
export async function runScoutWorker(profile) {
  const runId = startAgentRun("scout");
  const p = profile?.structured || {};
  const prefs = p.jobPreferences || {};

  try {
    const roles = Array.isArray(prefs.targetRoles) && prefs.targetRoles.length > 0
      ? prefs.targetRoles.slice(0, 3)
      : ["Software Engineer Intern", "Frontend Developer", "Full Stack Engineer"];

    const locations = Array.isArray(prefs.preferredLocations) && prefs.preferredLocations.length > 0
      ? prefs.preferredLocations.slice(0, 2)
      : ["Bengaluru", "India"];

    const generatedTasks = [];

    // Controlled query matrix (Max 3-4 top targeted queries)
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const location = locations[i % locations.length] || "India";

      const encodedKeyword = encodeURIComponent(role);
      const encodedLoc = encodeURIComponent(location);
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodedKeyword}&location=${encodedLoc}&f_TPR=r604800&position=1&pageNum=0`;
      const queryLabel = `${role} in ${location}`;

      const taskId = insertHunterTask({
        taskType: "job_search",
        query: queryLabel,
        searchUrl,
        scheduledAt: new Date().toISOString(),
      });

      generatedTasks.push({ taskId, query: queryLabel, searchUrl });
    }

    // Add 1 Remote opportunity query
    const remoteRole = roles[0] || "Software Engineer Intern";
    const remoteUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(remoteRole)}&location=Remote&f_TPR=r604800&position=1&pageNum=0`;
    const remoteQueryLabel = `${remoteRole} (Remote)`;
    const remoteTaskId = insertHunterTask({
      taskType: "job_search",
      query: remoteQueryLabel,
      searchUrl: remoteUrl,
      scheduledAt: new Date().toISOString(),
    });
    generatedTasks.push({ taskId: remoteTaskId, query: remoteQueryLabel, searchUrl: remoteUrl });

    finishAgentRun(runId, {
      status: "SUCCESS",
      itemsProcessed: generatedTasks.length,
    });

    console.log(`[Scout Worker] Generated ${generatedTasks.length} controlled search tasks.`);
    return { ok: true, count: generatedTasks.length, tasks: generatedTasks };
  } catch (err) {
    finishAgentRun(runId, {
      status: "FAILED",
      itemsProcessed: 0,
      errorDetails: err.message,
    });
    throw err;
  }
}
