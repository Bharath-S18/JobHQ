import fetch from "node-fetch";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

export async function ollamaGenerate(prompt) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Ollama request failed (${res.status}): ${body}. ` +
          `Is Ollama running? Try: ollama serve  —  and: ollama pull ${OLLAMA_MODEL}`
      );
    }

    const data = await res.json();
    return data.response || "";
  } catch (err) {
    throw new Error(
      `Ollama service unavailable (${err.message}). Start it with 'ollama serve' or configure ANTHROPIC_API_KEY in .env`
    );
  }
}
