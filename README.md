# Project Explorer – AI Q&A (Netlify-only)

This repo adds a grounded Q&A endpoint to your Project Explorer, **without** Azure/Graph. It precomputes embeddings from `data/projects.json` at build time, deploys a Netlify Function at `/api/ask`, and exposes a minimal chat UI in `index.html`.

## Quick start

1. Put your cleaned dataset into `data/projects.json`. Use the provided sample structure.
2. In Netlify, add environment variable **OPENAI_API_KEY**.
3. Deploy. The Netlify build runs `node ./scripts/build-embeddings.js` to generate `data/embeddings.json`.
4. Visit your site and try the chat box (it posts to `/api/ask`).

## Files

- `data/projects.json` – your dataset (replace with the real one)
- `scripts/build-embeddings.js` – makes `data/embeddings.json` using OpenAI embeddings
- `netlify/functions/ask.js` – Q&A endpoint (retrieval + LLM with citations)
- `netlify.toml` – Netlify config (build, redirects, packaged assets)
- `index.html` – minimal demo UI

## Filters

The function supports filters via JSON body:
```json
{
  "query": "Which projects increased transit ridership?",
  "filters": { "instructor": ["Alexander Bick"], "year": [2023] }
}
```

## Notes

- Ensure `data/embeddings.json` is included in the function bundle (configured via `included_files` in `netlify.toml`).
- If your dataset is large, consider splitting by year and loading only the needed file in the function.
- Re-run builds whenever `projects.json` changes so embeddings stay current.
