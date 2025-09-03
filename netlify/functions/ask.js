// netlify/functions/ask.js
// Works without embeddings or chat quota. Uses keyword scoring + simple intents.

const fs = require("fs");
const path = require("path");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4o-mini";
const DISABLE_LLM = String(process.env.DISABLE_LLM || "").toLowerCase() === "1";
const K = parseInt(process.env.TOP_K || "8", 10);

// ---- load data ----
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
const DOCS = (() => {
  const items = readJSON(path.resolve("data/projects.json")) || [];
  return items.map(it => ({
    id: it.id || it.project_title || "untitled",
    project_title: it.project_title || "Untitled",
    instructor: it.instructor || "",
    year: String(it.year || ""),
    problem_level: it.problem_level || "",
    source_url: it.source_url || "",
    text: (it.text || "").toString()
  }));
})();

// ---- utilities ----
function applyFilters(items, filters) {
  if (!filters) return items;
  const { instructor, year, problem_level } = filters;
  return items.filter(d => {
    let ok = true;
    if (instructor?.length) ok &&= new Set(instructor.map(s=>String(s).toLowerCase())).has(d.instructor.toLowerCase());
    if (year?.length)       ok &&= new Set(year.map(String)).has(d.year);
    if (problem_level?.length) ok &&= new Set(problem_level.map(s=>String(s).toLowerCase())).has(d.problem_level.toLowerCase());
    return ok;
  });
}
function scoreKeyword(query, docs){
  const q = (query||"").toLowerCase().match(/\b[\w-]+\b/g) || [];
  return docs.map(d=>{
    const title = d.project_title.toLowerCase();
    const meta  = (d.instructor + " " + d.problem_level + " " + d.year).toLowerCase();
    const body  = d.text.toLowerCase();
    let score=0;
    for (const t of q){
      const r = new RegExp(`\\b${t}\\b`, "g");
      score += (title.match(r)||[]).length*4 + (meta.match(r)||[]).length*2 + (body.match(r)||[]).length;
    }
    return { doc:d, score };
  }).sort((a,b)=>b.score-a.score);
}
function parseQueryHints(q){
  const years = Array.from((q||"").matchAll(/\b(19|20)\d{2}\b/g)).map(m=>m[0]);
  const wantCount = /\b(how\s+many|count|#)\b/i.test(q||"");
  const wantList  = /\b(list|which|show|give me)\b/i.test(q||"");
  return { years, wantCount, wantList };
}

// ---- optional LLM prose, wrapped safely ----
async function tryLLM(question, blocks){
  if (DISABLE_LLM || !OPENAI_API_KEY) return null;
  try{
    const numbered = blocks.map((b,i)=>`[${i+1}] (${b.project_title} — ${b.instructor||"Unknown"}, ${b.year||"n/a"})\n${b.text.slice(0,1500)}`).join("\n\n");
    const system = "Answer ONLY using the provided context. If insufficient, say: 'I don’t know based on the current dataset.' Cite as [1], [2], etc.";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${OPENAI_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({ model: CHAT_MODEL, temperature: 0.2,
        messages: [
          { role:"system", content: system },
          { role:"user", content: `Question: ${question}\n\nContext:\n${numbered}\n\nAnswer with citations:`}
        ]})
    });
    if (!res.ok) return null;  // quota or other error -> fall back
    const j = await res.json();
    return j.choices?.[0]?.message?.content?.trim() || null;
  }catch{ return null; }
}

// ---- handler ----
exports.handler = async (event) => {
  try{
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { query, filters } = JSON.parse(event.body || "{}");
    if (!query || !query.trim()) return { statusCode: 400, body: "Missing 'query'" };

    // apply filters + hints from natural language
    let filtered = applyFilters(DOCS, filters);
    const hints = parseQueryHints(query);
    if (hints.years.length) filtered = filtered.filter(d => hints.years.includes(d.year));

    // keyword ranking
    const top = scoreKeyword(query, filtered).slice(0, K).map(s => s.doc);

    // Non-LLM intents
    if (hints.wantCount || /^\s*how many\b/i.test(query)) {
      const n = filtered.length;
      const yrText = hints.years.length ? ` in ${hints.years.join(", ")}` : "";
      const answer = `I found **${n}** project${n===1?"":"s"}${yrText} in the current dataset. See citations for details.`;
      return ok(answer, top);
    }
    if (hints.wantList) {
      const list = top.slice(0,10).map((d,i)=>`${i+1}. ${d.project_title} — ${d.instructor||"Unknown"}, ${d.year||"n/a"}`).join("\n");
      const answer = list || "No matching projects found.";
      return ok(answer, top);
    }

    // Try LLM for nicer prose (if quota allows); else fallback summary
    const llm = await tryLLM(query, top);
    const fallback = top.length
      ? "Top matches:\n" + top.slice(0,5).map((d,i)=>`${i+1}. ${d.project_title} — ${d.instructor||"Unknown"}, ${d.year||"n/a"}`).join("\n")
      : "I don’t know based on the current dataset.";
    return ok(llm || fallback, top);

  }catch(e){
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};

function ok(answer, blocks){
  const citations = blocks.map((c,i)=>({
    n: i+1,
    id: c.id,
    title: c.project_title,
    instructor: c.instructor,
    year: c.year,
    problem_level: c.problem_level,
    source_url: c.source_url
  }));
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ answer, citations })
  };
}
