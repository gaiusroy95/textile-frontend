# TextileAI — Frontend

Vite + React studio for textile design: async full pipeline, layer separation, canvas editing, and multi-format export (PNG / TIFF / PSD).

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

## Studio flow

1. Choose input type (garment, swatch, scan, multi-swatch, etc.)
2. Optional: auto-separate layers, reduce watermark
3. Upload → full pipeline job (extract → seamless → variations → layers)
4. Edit on canvas: move, brush, region select, merge, reorder layers
5. Export PNG (canvas), TIFF CMYK, or PSD / layered ZIP from session files

## Backend

Requires the TextileAI FastAPI backend. Set `VITE_API_URL` to your deployed API URL.
