import { PDFParse } from "pdf-parse";

/**
 * Extract raw text from a PDF Buffer or plain text file.
 */
export async function extractTextFromBuffer(buffer, mimeType = "application/pdf") {
  if (!buffer || buffer.length === 0) return { text: "", isPdf: false };

  const isPdf =
    mimeType === "application/pdf" ||
    buffer.slice(0, 4).toString() === "%PDF";
  let text = "";

  if (isPdf) {
    try {
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      const result = await parser.getText();
      text = typeof result === "string" ? result : result?.text || "";
    } catch (err) {
      console.warn("PDFParse fallback:", err.message);
    }
  }

  if (!text) {
    text = buffer.toString("utf-8");
  }

  return { text, isPdf };
}

/**
 * Pure & High-Precision Resume Parser:
 * Accurately segments and parses sections exclusively from the provided raw text.
 */
export function parseResumeText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const cleanText = rawText.replace(/\r\n/g, "\n");
  const rawLines = cleanText.split("\n").map((l) => l.trim());
  const lines = rawLines.filter((l) => l && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l));

  // 1. Personal Information Extraction
  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const email = emailMatch ? emailMatch[0].trim() : "";

  const phoneMatch = cleanText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5}|\b\d{10,12}\b/);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // Full Name: First non-empty header line (not an email, phone, or heading)
  let fullName = "";
  for (const line of lines.slice(0, 5)) {
    if (
      line.length >= 2 &&
      line.length <= 40 &&
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("www.") &&
      !/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?/i.test(line) &&
      !/^(resume|curriculum|cv|summary|education|skills|profile|contact)/i.test(line) &&
      /^[a-zA-Z\s.,'-]+$/.test(line)
    ) {
      fullName = line.trim();
      break;
    }
  }

  // Location: Look at lines 2 to 5 for city/state/country
  let location = "";
  for (const line of lines.slice(1, 5)) {
    if (
      line.length < 40 &&
      !line.includes("@") &&
      !line.includes("+91") &&
      !line.includes("http") &&
      !line.includes("LinkedIn") &&
      !line.includes("GitHub") &&
      line !== fullName
    ) {
      const locMatch = line.match(/\b(Bengaluru|Bangalore|Hyderabad|Pune|Mumbai|Delhi|Chennai|Noida|Gurgaon|San Francisco|New York|Austin|Seattle|Remote|India|USA)\b/i);
      if (locMatch) {
        location = line.trim();
        break;
      }
    }
  }

  // Online URLs
  let linkedin = "";
  const explicitLinkedin = cleanText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_%\-]+)/i);
  if (explicitLinkedin) {
    linkedin = explicitLinkedin[0].startsWith("http") ? explicitLinkedin[0] : `https://${explicitLinkedin[0]}`;
  }

  let github = "";
  const explicitGithub = cleanText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_%\-]+)/i);
  if (explicitGithub) {
    github = explicitGithub[0].startsWith("http") ? explicitGithub[0] : `https://${explicitGithub[0]}`;
  }

  let leetcode = "";
  const explicitLeetcode = cleanText.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_%\-]+)/i);
  if (explicitLeetcode) {
    leetcode = explicitLeetcode[0].startsWith("http") ? explicitLeetcode[0] : `https://${explicitLeetcode[0]}`;
  }

  let portfolio = "";
  const explicitPortfolio = cleanText.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.(?:dev|me|io|app|tech|in|com))(?:\/[^\s]*)?/i);
  if (
    explicitPortfolio &&
    !explicitPortfolio[0].includes("github.com") &&
    !explicitPortfolio[0].includes("linkedin.com") &&
    !explicitPortfolio[0].includes("leetcode.com") &&
    !explicitPortfolio[0].includes("gmail.com")
  ) {
    portfolio = explicitPortfolio[0].startsWith("http") ? explicitPortfolio[0] : `https://${explicitPortfolio[0]}`;
  }

  // 2. Section Partitioning
  const sectionKeywords = [
    { key: "summary", regex: /^(?:professional\s+)?(?:summary|profile|about(?:\s+me)?|objective)\b/i },
    { key: "education", regex: /^(?:education|academic\s+background|academics|qualifications)\b/i },
    { key: "skills", regex: /^(?:technical\s+|core\s+)?skills(?:\s+(&|and)\s+technologies)?\b/i },
    { key: "projects", regex: /^(?:academic\s+|personal\s+)?projects\b/i },
    { key: "experience", regex: /^(?:work\s+|professional\s+)?experience|employment|internships?\b/i },
    { key: "certifications", regex: /^(?:certifications?|certificates?|licenses?)\b/i },
    { key: "achievements", regex: /^(?:achievements?|honors?|awards?|accomplishments?)\b/i },
    { key: "languages", regex: /^(?:languages\s+spoken|languages)\b/i },
  ];

  const sections = {};
  let currentSection = "header";
  sections[currentSection] = [];

  for (const line of lines) {
    const cleanHeader = line.replace(/[:\-_]/g, "").trim();
    const matched = sectionKeywords.find((s) => s.regex.test(cleanHeader));
    if (matched && cleanHeader.length < 35) {
      currentSection = matched.key;
      if (!sections[currentSection]) sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  // 3. Professional Summary
  let summary = "";
  if (sections.summary && sections.summary.length > 0) {
    summary = sections.summary.join(" ").replace(/\s+/g, " ").slice(0, 1000).trim();
  }

  // 4. Skills Parsing
  const parsedSkills = {
    programming: [],
    frontend: [],
    backend: [],
    databases: [],
    ai_ml: [],
    tools: [],
  };

  const skillLines = sections.skills || [];
  for (const line of skillLines) {
    const colonIdx = line.indexOf(":");
    const content = colonIdx !== -1 ? line.slice(colonIdx + 1) : line;
    const tokens = content.split(/[,|•·\t]/).map((t) => t.trim()).filter(Boolean);

    for (const token of tokens) {
      const t = token.replace(/^[•\-*]\s*/, "").trim();
      if (!t || t.length > 25) continue;

      if (/^(Python|Java|C|C\+\+|JavaScript|TypeScript|SQL|Rust|Go|Kotlin|Ruby|PHP|C#|Dart|Swift)$/i.test(t)) {
        if (!parsedSkills.programming.includes(t)) parsedSkills.programming.push(t);
      } else if (/^(React|ReactJS|React\.js|NextJS|Next\.js|HTML5|HTML|CSS3|CSS|Tailwind CSS|Tailwind|Redux|EJS|Vue|Angular|Bootstrap|Vite|Sass)$/i.test(t)) {
        const norm = t.replace(/JS$/i, "").replace(/\.js$/i, "");
        const label = norm.toLowerCase() === "react" ? "React" : norm.toLowerCase() === "next" ? "Next.js" : norm.toLowerCase() === "tailwind" ? "Tailwind CSS" : t;
        if (!parsedSkills.frontend.includes(label)) parsedSkills.frontend.push(label);
      } else if (/^(Node|NodeJS|Node\.js|Express|ExpressJS|Express\.js|FastAPI|Django|Flask|Spring Boot|REST APIs|GraphQL|NestJS|MERN)$/i.test(t)) {
        const norm = t.toLowerCase().includes("node") ? "Node.js" : t.toLowerCase().includes("express") ? "Express.js" : t;
        if (!parsedSkills.backend.includes(norm)) parsedSkills.backend.push(norm);
      } else if (/^(MongoDB|PostgreSQL|MySQL|SQLite|Redis|Firebase|Supabase|DynamoDB|Oracle)$/i.test(t)) {
        if (!parsedSkills.databases.includes(t)) parsedSkills.databases.push(t);
      } else if (/^(NLP|RAG|Scikit-learn|TensorFlow|PyTorch|OpenAI|Gemini|LangChain|HuggingFace)$/i.test(t)) {
        if (!parsedSkills.ai_ml.includes(t)) parsedSkills.ai_ml.push(t);
      } else if (/^(VS Code|Git|GitHub|GitLab|Docker|Kubernetes|Linux|Postman|AWS|GCP|Azure|Render|Vercel|Jira|Puppeteer)$/i.test(t)) {
        if (!parsedSkills.tools.includes(t)) parsedSkills.tools.push(t);
      } else {
        if (line.toLowerCase().includes("language") && !parsedSkills.programming.includes(t)) {
          parsedSkills.programming.push(t);
        } else if (line.toLowerCase().includes("web") || line.toLowerCase().includes("frontend")) {
          if (!parsedSkills.frontend.includes(t)) parsedSkills.frontend.push(t);
        } else if (line.toLowerCase().includes("tool") || line.toLowerCase().includes("developer")) {
          if (!parsedSkills.tools.includes(t)) parsedSkills.tools.push(t);
        }
      }
    }
  }

  // 5. Education Parsing
  const education = [];
  const eduLines = sections.education || [];
  let currentEdu = null;

  for (let idx = 0; idx < eduLines.length; idx++) {
    const line = eduLines[idx];
    const isInstHeader =
      line.includes("College") ||
      line.includes("Institute") ||
      line.includes("School") ||
      line.includes("University") ||
      /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?\b\d{4}\b\s*[–\-to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?\b(?:\d{4}|Present)\b/i.test(line);

    if (isInstHeader) {
      if (currentEdu) education.push(currentEdu);

      const dateMatch = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?\b\d{4}\b\s*[–\-to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?\b(?:\d{4}|Present)\b/i);
      const dateParts = dateMatch ? dateMatch[0].split(/[–\-to]+/i).map((s) => s.trim()) : [];
      const instName = line.split(/\t|\s{2,}|(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/i)[0].trim();

      currentEdu = {
        id: `edu_${Date.now()}_${education.length + 1}`,
        institution: instName || line,
        degree: "",
        location: instName.includes("Bengaluru") ? "Bengaluru, India" : "",
        startDate: dateParts[0] || "",
        endDate: dateParts[1] || "Present",
        grade: "",
        coursework: "",
      };
    } else if (currentEdu) {
      const cgpaMatch = line.match(/CGPA\s*[:—\-]?\s*(\d{1,2}(?:\.\d{1,2})?)/i);
      const pctMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?%)/);

      if (cgpaMatch && !currentEdu.grade) {
        currentEdu.grade = `CGPA: ${cgpaMatch[1]}`;
      } else if (pctMatch && !currentEdu.grade) {
        currentEdu.grade = pctMatch[1];
      }

      if (!currentEdu.degree) {
        const degreePart = line.split(/[—–-]\s*(?:CGPA|\d)/i)[0].trim();
        currentEdu.degree = degreePart || line.trim();
      }
    }
  }
  if (currentEdu) education.push(currentEdu);

  // 6. Experience Parsing
  const experience = [];
  const expLines = sections.experience || [];
  let currentExp = null;

  for (const line of expLines) {
    const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
    const dateMatch = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d)\s*.*(?:–|-|to)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d|Present|Current)/i);

    if (!isBullet && (dateMatch || line.includes("–") || line.includes("-") || !currentExp)) {
      if (currentExp) experience.push(currentExp);
      const parts = line.split(/[|·•–-]/).map((p) => p.trim()).filter(Boolean);
      currentExp = {
        id: `exp_${Date.now()}_${experience.length + 1}`,
        jobTitle: parts[0] || line,
        company: parts[1] || "",
        location: "",
        employmentType: "Full-time",
        startDate: dateMatch ? dateMatch[1] : "",
        endDate: dateMatch ? dateMatch[2] : "Present",
        currentlyWorking: true,
        bullets: [],
      };
    } else if (currentExp) {
      const cleanBullet = line.replace(/^[•\-*]\s*/, "").trim();
      if (cleanBullet) currentExp.bullets.push(cleanBullet);
    }
  }
  if (currentExp) experience.push(currentExp);

  // 7. Projects Parsing
  const projects = [];
  const projLines = sections.projects || [];
  let currentProj = null;

  for (const line of projLines) {
    const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
    const isHeader =
      !isBullet &&
      line.length > 3 &&
      line.length < 80 &&
      (line.includes("—") || line.includes("–") || line.includes("|") || /^[A-Z][a-zA-Z0-9\s_-]+$/.test(line));

    if (isHeader) {
      if (currentProj) projects.push(currentProj);
      const parts = line.split(/[—–|]/).map((p) => p.trim());
      currentProj = {
        id: `proj_${Date.now()}_${projects.length + 1}`,
        name: parts[0] || line,
        description: parts.slice(1).join(" — ") || "",
        technologies: "",
        keyContributions: "",
        githubUrl: "",
        liveDemoUrl: "",
      };
    } else if (currentProj) {
      const cleanText = line.replace(/^[•\-*]\s*/, "").trim();
      if (cleanText) {
        // Detect tech stack keywords in bullets
        const techMatch = cleanText.match(/\b(?:using|with|via|stack:?)\s+([A-Za-z0-9\s,.\-+]+)/i);
        if (techMatch && !currentProj.technologies) {
          currentProj.technologies = techMatch[1].slice(0, 60).trim();
        }

        const ghMatch = cleanText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/i);
        if (ghMatch) currentProj.githubUrl = ghMatch[0].startsWith("http") ? ghMatch[0] : `https://${ghMatch[0]}`;

        if (!currentProj.keyContributions) {
          currentProj.keyContributions = cleanText;
        } else {
          currentProj.keyContributions += `\n• ${cleanText}`;
        }
      }
    }
  }
  if (currentProj) projects.push(currentProj);

  // 8. Certifications Parsing
  const certifications = [];
  const certLines = sections.certifications || [];
  for (const line of certLines) {
    const cleanCert = line.replace(/^[•\-*]\s*/, "").trim();
    if (cleanCert.length > 3 && !/^languages/i.test(cleanCert) && !cleanCert.includes("English")) {
      const parts = cleanCert.split(/[—–-]/).map((p) => p.trim());
      certifications.push({
        id: `cert_${Date.now()}_${certifications.length + 1}`,
        name: parts[0] || cleanCert,
        issuer: parts[1] || "",
        issueDate: "",
        credentialId: "",
        credentialUrl: "",
      });
    }
  }

  return {
    personalInfo: {
      fullName: fullName,
      email: email,
      phone: phone,
      location: location,
      linkedin: linkedin,
      github: github,
      leetcode: leetcode,
      portfolio: portfolio,
    },
    summary: summary,
    skills: parsedSkills,
    education: education,
    experience: experience,
    projects: projects,
    certifications: certifications,
    rawText: cleanText,
  };
}
