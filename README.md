# Truckinzy Board App (Standalone)

Job board + candidate ATS flow (Next.js App Router) backed by Supabase (Auth + Postgres + Storage).

If you are new to this project:

- Start with the **non‑technical product overview**: [docs/product-overview.md](docs/product-overview.md)
- Then read the **board app architecture doc**: [docs/board-app-architecture.md](docs/board-app-architecture.md)

The rest of this file focuses on local setup.

## Run locally

```bash
cd board-app
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Copy and fill:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

Optional (resume parsing):
- `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`)
- `OPENROUTER_API_KEY`
- If neither is set, parsing falls back to local text extraction + heuristics.

## Supabase setup (high level)

1. Enable Supabase Auth providers:
   - Google OAuth (recommended)
   - Email OTP / Magic Link
2. Ensure tables exist in `public`:
   - `jobs`, `candidates`, `applications`, `file_storage`, `parsing_jobs`, `work_experience`, `education`
3. Create a Storage bucket for resumes (default code expects `resume-files`).
4. Apply the migration shipped in this repo:
   - `supabase/migrations/ats_candidate_flow_updates.sql`

## Routes

- `/` Jobs list
- `/jobs/:id` Job details
- `/apply/:id` Apply stepper (Auth → Resume → Autofill/Profile → Submit)
- `/auth` Login page
- `/dashboard` Candidate dashboard (profile + applications)

## Moving to another repo

This folder is self-contained. To host it as a separate repo:
1. Copy the entire `board-app/` directory into a new repository root.
2. Commit the copied files.
3. Add `.env.local` in your deployment platform using `.env.example` as reference.
4. Deploy as a standard Next.js app (`npm install` + `npm run build` + `npm run start`).
