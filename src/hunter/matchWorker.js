import { scoreMatch, localScoreMatch } from "../tailor.js";
import { saveJobMatch, startAgentRun, finishAgentRun } from "../db.js";

/**
 * Match Worker
 * Evaluates candidate Master Profile against discovered jobs
 * and stores structured fit scoring with detailed breakdown.
 */
export async function runMatchWorker({ job, profile }) {
  const runId = startAgentRun("matcher");
  const resumeText = profile?.resume_text || "";
  const structured = profile?.structured || {};

  try {
    const rawResult = await scoreMatch({
      resumeText,
      structured,
      jobTitle: job.title,
      jobDescription: job.description,
    });

    const localMeta = localScoreMatch({
      resumeText,
      structured,
      jobTitle: job.title,
      jobDescription: job.description,
    });

    const score = typeof rawResult.score === "number" ? rawResult.score : localMeta.score;
    const reasoning = rawResult.reason || localMeta.reason;
    const matchedSkills = localMeta.matchedSkills || [];
    const missingSkills = localMeta.missingSkills || [];

    const concerns = [];
    let experienceMatch = true;
    let educationMatch = true;

    if (job.experienceLevel === "senior") {
      experienceMatch = false;
      concerns.push("Target role specifies senior / lead expectations.");
    }

    if (missingSkills.length > 2) {
      concerns.push(`Specialized tooling requested: ${missingSkills.slice(0, 3).join(", ").toUpperCase()}`);
    }

    saveJobMatch({
      jobId: job.id,
      score,
      matchedSkills,
      missingSkills,
      experienceMatch: experienceMatch ? 1 : 0,
      educationMatch: educationMatch ? 1 : 0,
      concerns,
      reasoning,
      model: process.env.GEMINI_API_KEY ? "gemini-1.5-flash" : "local-deterministic",
    });

    finishAgentRun(runId, { status: "SUCCESS", itemsProcessed: 1 });

    return {
      score,
      reasoning,
      matchedSkills,
      missingSkills,
      experienceMatch,
      educationMatch,
      concerns,
    };
  } catch (err) {
    finishAgentRun(runId, { status: "FAILED", itemsProcessed: 0, errorDetails: err.message });
    throw err;
  }
}
