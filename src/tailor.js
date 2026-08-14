import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import { ollamaGenerate } from "./ollama.js";

// AI Provider precedence:
// 1. Google Gemini (free tier) if GEMINI_API_KEY is configured or TAILOR_PROVIDER === "gemini"
// 2. Anthropic Claude if ANTHROPIC_API_KEY is configured or TAILOR_PROVIDER === "anthropic"
// 3. Ollama local LLM if TAILOR_PROVIDER === "ollama"
// 4. Deterministic Local Skill-Match Engine (offline fallback, 100% reliable)

function getActiveProvider() {
  if (process.env.TAILOR_PROVIDER) return process.env.TAILOR_PROVIDER.toLowerCase();
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "deterministic";
}

async function callGemini(prompt, apiKey) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text response from Gemini");
  return text;
}

async function callAnthropic(prompt, apiKey) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
}

async function complete(prompt, { maxTokens = 1500 } = {}) {
  const provider = getActiveProvider();

  try {
    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      return await callGemini(prompt, process.env.GEMINI_API_KEY);
    }
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      return await callAnthropic(prompt, process.env.ANTHROPIC_API_KEY);
    }
    if (provider === "ollama") {
      return await ollamaGenerate(prompt);
    }
  } catch (err) {
    console.warn(`[AI Engine] ${provider} call failed:`, err.message);
  }

  return null;
}

// --------------------------------------------------------------------------
// Deterministic Skill & Experience Match Scorer (Zero-Downtime Fallback)
// --------------------------------------------------------------------------
const TECH_TAXONOMY = [
  "react", "typescript", "javascript", "node.js", "nodejs", "express", "python",
  "fastapi", "django", "java", "spring", "c++", "c#", "golang", "go", "rust",
  "html", "css", "tailwind", "next.js", "nextjs", "vue", "angular", "redux",
  "postgresql", "postgres", "mongodb", "mysql", "sqlite", "redis", "prisma",
  "docker", "kubernetes", "aws", "gcp", "azure", "git", "github", "graphql",
  "rest", "ci/cd", "jest", "unit testing", "data structures", "algorithms"
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractKeywords(text) {
  if (!text) return new Set();
  const lower = text.toLowerCase();
  const found = new Set();
  for (const tech of TECH_TAXONOMY) {
    const escaped = escapeRegex(tech);
    const regex = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, "i");
    if (regex.test(lower)) {
      found.add(tech);
    }
  }
  return found;
}

export function localScoreMatch({ resumeText, structured, jobTitle, jobDescription }) {
  const resumeCombined = [
    resumeText || "",
    structured?.skills ? Object.values(structured.skills).flat().join(" ") : "",
    structured?.projects ? structured.projects.map((p) => `${p.name} ${p.technologies} ${p.description}`).join(" ") : "",
    structured?.education ? structured.education.map((e) => `${e.degree} ${e.coursework || ""}`).join(" ") : "",
  ].join(" ");

  const candidateKeywords = extractKeywords(resumeCombined);
  const jobKeywords = extractKeywords(`${jobTitle || ""} ${jobDescription || ""}`);

  if (jobKeywords.size === 0) {
    return {
      score: 75,
      reason: "General software engineering alignment with candidate technical foundation.",
      matchedSkills: Array.from(candidateKeywords).slice(0, 5),
      missingSkills: [],
    };
  }

  const matched = [];
  const missing = [];

  for (const tech of jobKeywords) {
    if (candidateKeywords.has(tech)) {
      matched.push(tech);
    } else {
      missing.push(tech);
    }
  }

  const ratio = matched.length / jobKeywords.size;
  // Scale between 55% and 98% based on overlap
  let score = Math.round(55 + ratio * 43);
  if (matched.length === 0) score = 50;

  let reason = "";
  if (matched.length > 0) {
    const formattedMatched = matched.map((m) => m.toUpperCase()).slice(0, 4).join(", ");
    reason = `Strong alignment in key required technologies: ${formattedMatched}.`;
  } else {
    reason = `Candidate foundation in core CS principles; requires upskilling in specific stack.`;
  }

  return {
    score,
    reason,
    matchedSkills: matched,
    missingSkills: missing,
  };
}

// --------------------------------------------------------------------------
// Tailoring Application Engine (AI with Local Verified Fallback)
// --------------------------------------------------------------------------
export async function tailorApplication({ resumeText, structured, jobTitle, company, jobDescription }) {
  const prompt = `You are an expert career agent. Tailor the candidate's application strictly using their VERIFIED experience from their base resume. Do NOT invent fake companies, metrics, or technologies not present in their resume.

CANDIDATE BASE RESUME:
${resumeText || JSON.stringify(structured || {})}

JOB TITLE: ${jobTitle}
COMPANY: ${company || "Target Company"}
JOB DESCRIPTION:
${jobDescription || "Software Engineering Role"}

Produce two clean sections:
1. TAILORED_RESUME_BULLETS: 4 to 6 strong, action-driven bullet points highlighting the candidate's most relevant projects, technical skills, and coursework tailored for this specific role.
2. COVER_LETTER: A concise, compelling 3-paragraph cover letter expressing genuine interest in the company and explaining why the candidate's background matches the requirements.

Format your output strictly as:
---RESUME---
<bullet points>
---COVER---
<cover letter>`;

  const aiResponse = await complete(prompt, { maxTokens: 1500 });

  if (aiResponse && aiResponse.includes("---RESUME---")) {
    const [, resumePart, coverPart] = aiResponse.split(/---RESUME---|---COVER---/);
    return {
      resumeBullets: (resumePart || "").trim(),
      coverLetter: (coverPart || "").trim(),
      provider: getActiveProvider(),
    };
  }

  // Deterministic Verified Fallback if AI offline
  const candidateName = structured?.personalInfo?.fullName || "Candidate";
  const projects = structured?.projects || [];
  const topProjects = projects.slice(0, 3);
  const matched = localScoreMatch({ resumeText, structured, jobTitle, jobDescription });

  const bullets = [];
  topProjects.forEach((proj) => {
    if (proj.description) {
      bullets.push(`• Architected and developed ${proj.name} utilizing ${proj.technologies || "modern full-stack technologies"}, implementing robust data flow and responsive user interfaces.`);
    }
    if (proj.keyContributions) {
      bullets.push(`• ${proj.keyContributions.split("\n")[0].replace(/^[-•*]\s*/, "")}`);
    }
  });

  if (bullets.length === 0) {
    bullets.push(`• Built scalable web applications with high test coverage and clean architectural modularity.`);
    bullets.push(`• Implemented RESTful APIs and database schemas optimized for performance and reliability.`);
    bullets.push(`• Collaborated on responsive UI components ensuring cross-browser compatibility and accessibility.`);
  }

  const coverLetter = `Dear Hiring Team at ${company || "Company"},

I am writing to express my strong enthusiasm for the ${jobTitle || "Software Engineer"} opportunity. With a rigorous foundation in software engineering and hands-on experience building ${topProjects.map((p) => p.name).join(" and ") || "high-performance web applications"}, I am eager to contribute to your team's technical milestones.

My technical background centers on ${Array.from(matched.matchedSkills).slice(0, 4).map((s) => s.toUpperCase()).join(", ") || "full-stack development and modern web technologies"}. In my project work, I have focused on writing clean, maintainable code, architecting efficient data pipelines, and delivering responsive user experiences that solve tangible problems.

I have long admired ${company || "your team"}'s engineering standard and innovative products. I would welcome the opportunity to discuss how my technical skills and enthusiasm make me a strong fit for this role.

Thank you for your time and consideration.

Warm regards,
${candidateName}`;

  return {
    resumeBullets: bullets.join("\n"),
    coverLetter,
    provider: "local-verified",
  };
}

// --------------------------------------------------------------------------
// Score Match Engine
// --------------------------------------------------------------------------
export async function scoreMatch({ resumeText, structured, jobTitle, jobDescription }) {
  const prompt = `Score how well this candidate's resume matches the job description on a scale of 0 to 100.
Respond with ONLY valid JSON and nothing else:
{"score": <number between 0 and 100>, "reason": "<one concise sentence explaining the match>"}

RESUME:
${resumeText || JSON.stringify(structured || {})}

JOB TITLE: ${jobTitle}
JOB DESCRIPTION:
${jobDescription}`;

  const aiResponse = await complete(prompt, { maxTokens: 250 });

  if (aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0].replace(/```json|```/g, "").trim());
        if (typeof parsed.score === "number") {
          return {
            score: Math.min(100, Math.max(0, Math.round(parsed.score))),
            reason: parsed.reason || "Evaluated by AI match scoring engine.",
          };
        }
      }
    } catch (e) {}
  }

  return localScoreMatch({ resumeText, structured, jobTitle, jobDescription });
}
