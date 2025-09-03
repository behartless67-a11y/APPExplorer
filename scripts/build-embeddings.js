
/**
 * Build embeddings from data/projects.json into data/embeddings.json
 * Uses OpenAI Embeddings (text-embedding-3-small).
 * Requires env: OPENAI_API_KEY
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";

const PROJECTS = path.resolve("data/projects.json");
const OUT = path.resolve("data/embeddings.json");

function textHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function naiveChunk(text, maxChars = 3500, overlap = 300) {
  if (!text || text.length <= maxChars) return [text || ""];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + maxChars, text.length);
    chunks.push(text.slice(i, end));
    i = end - overlap;
    if (i < 0) i = 0;
    if (i >= text.length) break;
  }
  return chunks;
}

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding error: ${res.status} ${t}`);
  }
  const json = await res.json();
  return json.data.map(d => d.embedding);
}

(async () => {
  try {
    if (!OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY env var.");
      process.exit(1);
    }

    if (!fs.existsSync(PROJECTS)) {
      console.error(`Missing ${PROJECTS}. Create data/projects.json first.`);
      process.exit(1);
    }

    const items = JSON.parse(fs.readFileSync(PROJECTS, "utf8"));
    const chunks = [];

    for (const it of items) {
      const baseMeta = {
        id: it.id || textHash((it.project_title || "Untitled") + ":" + (it.source_url || "")),
        project_title: it.project_title || "Untitled",
        instructor: it.instructor || "",
        year: it.year || "",
        problem_level: it.problem_level || "",
        source_url: it.source_url || ""
      };

      const texts = it.text ? naiveChunk(it.text) : [];
      if (texts.length === 0) continue;

      texts.forEach((t, idx) => {
        chunks.push({
          id: `${baseMeta.id}#${idx + 1}`,
          text: t,
          meta: baseMeta
        });
      });
    }

    const BATCH = 64;
    const out = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embeds = await embedBatch(slice.map(s => s.text));
      for (let j = 0; j < slice.length; j++) {
        out.push({
          id: slice[j].id,
          meta: slice[j].meta,
          embedding: embeds[j]
        });
      }
      console.log(`Embedded ${Math.min(i + BATCH, chunks.length)} / ${chunks.length}`);
    }

    fs.writeFileSync(OUT, JSON.stringify(out));
    console.log(`Wrote ${OUT} with ${out.length} chunks.`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
