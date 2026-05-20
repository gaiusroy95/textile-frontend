# TextileAI — Frontend

Vite + React studio for uploading garments, running the textile pipeline, editing layers, and exporting PNGs.

## Stack

- Vite 6, React 18, TypeScript
- TailwindCSS, Fabric.js, Framer Motion

## Quick start

```bash
npm install
cp .env.example .env    # Windows: copy .env.example .env
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default `http://localhost:8000`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Typecheck (`tsc -b`) |

## Deploy (Vercel)

1. Push **this folder** as its own GitHub repository.
2. Import project in Vercel (framework preset: **Vite**).
3. Set environment variable:
   ```
   VITE_API_URL=https://your-api.onrender.com
   ```
4. Deploy. Rebuild after changing `VITE_API_URL`.

## Demo flow

1. Upload garment image
2. Extract fabric → seamless tile → AI variations
3. Edit on canvas (Fabric.js)
4. Export PNG

## Backend

Requires the TextileAI FastAPI backend. Set `VITE_API_URL` to your deployed API URL.
