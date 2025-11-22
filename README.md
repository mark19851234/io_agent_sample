# Summary Agent Sample (React + Vite)

Simple React + Vite sample that calls your summary agent API via a secure development proxy. The proxy injects the `Authorization` header using an environment variable so your key is never exposed to the browser in development.

## Prerequisites
- Node.js 18+ recommended
- Your dev API key (looks like `io-v1-...`)

## Setup
1. Navigate to the project:
   ```bash
   cd summary-agent-sample
   ```
2. Create a local env file to hold your dev key:
   ```bash
   printf "IO_API_KEY=io-v1-YOUR-DEV-API-KEY\n" > .env.local
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open the URL shown in your terminal (usually `http://localhost:5173`).

## How it works
- Summary page posts to `/api/agents/summary` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["summary_agent"],
    "args": { "type": "summarize_text" }
  }
  ```
- Vite dev proxy (configured in `vite.config.ts`) forwards the request to:
  `${IO_API_BASE}/api/v1/workflows/run`
- The proxy adds `Authorization: Bearer $IO_API_KEY` from `.env.local`.

### Linear agent page
- Linear page posts to `/api/agents/linear` with:
  ```json
  {
    "text": "Some text...",
    "agent_names": ["custom_agent"],
    "args": {
      "type": "custom",
      "name": "calc 2+2",
      "objective": "Calculate 2+2",
      "instructions": "Return result of calculation"
    }
  }
  ```

### Sentiment analysis page
- Sentiment page posts to `/api/agents/sentiment` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["sentiment_analysis_agent"],
    "args": { "type": "sentiment" }
  }
  ```
  Example curl:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer io-v1-YOUR-DEV-API-KEY" \
    --data '{
      "text": "I recently purchased the latest smartphone, and I have mixed feelings about it. The design is absolutely stunning, and the display quality is top-notch. I love how vibrant and smooth everything looks. However, the battery life is disappointing. It barely lasts a full day, even with moderate use, which is frustrating. The camera takes great pictures in daylight, but the low-light performance is underwhelming. Overall, it’s a decent phone, but for the price, I expected better battery performance.",
      "agent_names": ["sentiment_analysis_agent"],
      "args": { "type": "sentiment" }
    }' \
    "$IO_API_BASE/api/v1/workflows/run"
  ```

## Production note
Vite's dev proxy is for local development only. For production, proxy this route via a server (Node/Edge function) that reads `IO_API_KEY` from server-side env and forwards the request, never exposing the key client-side.

## Configuration
Create `.env.local`:
```bash
IO_API_KEY=io-v1-YOUR-DEV-API-KEY
# Defaults to the dev environment if not set:
IO_API_BASE=https://api.intelligence-dev.io.solutions
```

## Files of interest
- `vite.config.ts`: Proxy configuration that injects the Authorization header
- `src/App.tsx`: Router + layout with navigation
- `src/pages/SummaryPage.tsx`: Summary agent UI
- `src/pages/LinearPage.tsx`: Linear agent UI
- `src/main.tsx`, `index.html`: App bootstrap



