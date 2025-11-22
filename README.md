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

### Named Entity Recognizer
- Entities page posts to `/api/agents/entities` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["extractor"],
    "args": { "type": "extract_categorized_entities" }
  }
  ```
  Example curl:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer io-v1-YOUR-DEV-API-KEY" \
    --data '{
      "text": "A leading technology company recently announced the launch of its latest smartphone, the Nova X, at an event in Tech Valley. The company’s CEO, Jordan Lane, highlighted the device’s improved battery life, advanced camera system, and AI-powered enhancements. To achieve higher performance and energy efficiency, the company partnered with Coretron Systems to develop the new Zenith chipset.Pre-orders will begin on October 10, and the device will be available in global markets by October 20. Industry analysts predict strong demand across multiple regions, driven by innovation and evolving consumer expectations.",
      "agent_names": ["extractor"],
      "args": { "type": "extract_categorized_entities" }
    }' \
    "$IO_API_BASE/api/v1/workflows/run"
  ```

### Classification
- Classification page posts to `/api/agents/classification` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["classification_agent"],
    "args": { "type": "classify", "classify_by": ["fact", "fiction", "sci-fi", "fantasy"] }
  }
  ```
  Example curl:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer io-v1-YOUR-DEV-API-KEY" \
    --data '{
      "text": "A major tech company has announced a breakthrough in battery technology that significantly enhances energy density and reduces charging time. This innovation is expected to accelerate the adoption of electric vehicles, making them more practical for everyday use. Industry experts predict that this advancement could drive increased competition in the market and attract further investment in sustainable energy solutions.",
      "agent_names": ["classification_agent"],
      "args": { "type": "classify", "classify_by": ["fact", "fiction", "sci-fi", "fantasy"] }
    }' \
    "$IO_API_BASE/api/v1/workflows/run"
  ```

### Translation
- Translation page posts to `/api/agents/translation` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["translation_agent"],
    "args": { "type": "translate_text", "target_language": "spanish" }
  }
  ```
  Example curl:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer io-v1-YOUR-DEV-API-KEY" \
    --data '{
      "text": "The future of artificial intelligence is rapidly evolving. With advancements in deep learning and neural networks, AI is transforming industries such as healthcare, finance, and transportation. As technology continues to improve, AI will play an even greater role in solving complex problems and enhancing human capabilities.",
      "agent_names": ["translation_agent"],
      "args": { "type": "translate_text", "target_language": "spanish" }
    }' \
    "$IO_API_BASE/api/v1/workflows/run"
  ```

### Moderation
- Moderation page posts to `/api/agents/moderation` with:
  ```json
  {
    "text": "Your text...",
    "agent_names": ["moderation_agent"],
    "args": { "type": "moderation", "threshold": 0.5 }
  }
  ```
  Example curl:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer io-v1-YOUR-DEV-API-KEY" \
    --data '{
      "text": "I absolutely hate this service! It’s a total scam, and the customer support is useless. Anyone who buys from them is getting ripped off. I swear, if they don’t fix this issue, I’m going to make sure no one ever buys from them again! Also, I’ve seen people spreading false information about their competitors—this is unethical business practice.",
      "agent_names": ["moderation_agent"],
      "args": { "type": "moderation", "threshold": 0.5 }
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



