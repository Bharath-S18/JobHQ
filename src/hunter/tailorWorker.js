import { tailorApplication } from "../tailor.js";
import { saveTailoredDocument, startAgentRun, finishAgentRun } from "../db.js";

const DEFAULT_AUTO_TAILOR_THRESHOLD = 85;

/**
 * Tailor Worker
 * Automatically tailors high-scoring roles (>=85%) or generates on demand.
 */
export async function runTailorWorker({ job, profile, matchScore = 0, force = false }) {
  const shouldTailor = force || matchScore >= DEFAULT_AUTO_TAILOR_THRESHOLD;
  if (!shouldTailor) {
    return { tailored: false, reason: `Match score ${matchScore}% below automatic tailoring threshold (85%).` };
  }

  const runId = startAgentRun("tailor");
  const resumeText = profile?.resume_text || "";
  const structured = profile?.structured || {};

  try {
    const result = await tailorApplication({
      resumeText,
      structured,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
    });

    saveTailoredDocument({
      jobId: job.id,
      tailoredResume: result.resumeBullets,
      tailoredCoverLetter: result.coverLetter,
      aiProvider: result.provider || "gemini",
    });

    finishAgentRun(runId, { status: "SUCCESS", itemsProcessed: 1 });

    return {
      tailored: true,
      resumeBullets: result.resumeBullets,
      coverLetter: result.coverLetter,
      provider: result.provider,
    };
  } catch (err) {
    finishAgentRun(runId, { status: "FAILED", itemsProcessed: 0, errorDetails: err.message });
    throw err;
  }
}
