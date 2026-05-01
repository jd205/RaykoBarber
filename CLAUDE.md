# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth)

### App Router layout

- `app/` — pages and server actions. All route segments are either public (`/`, `/booking`, `/forgot-password`, `/reset-password`) or protected (`/dashboard`). Auth modal is triggered via URL params (`?auth=login|signup`) rather than a dedicated route.
- `app/actions/auth.ts` — `login()` / `signup()` server actions using FormData; redirect to `/dashboard` on success.
- `app/auth/callback/` — OAuth / email confirmation callback.
- No `/api/` routes — all server-side logic is in server actions or accessed directly via Supabase.

### Component split

- **Server components:** page files, layouts, and data-fetching wrappers.
- **Client components (`"use client"`):** Auth modal, booking wizard, admin calendar/user-manager — anything with `useState` / `useEffect`.

### Auth

- `lib/supabase/server.ts` — server-side client (reads cookies; used in page/layout server components).
- `lib/supabase/client.ts` — browser client (used in client components).
- `lib/supabase/proxy.ts` — middleware (`updateSession`) that refreshes auth tokens on every request and syncs cookies; the matcher in `proxy.ts` at the root excludes static assets.
- The user's role (`admin` | `client`) lives in the `profiles` table. `medinajd205@gmail.com` is auto-assigned `admin` by a database trigger.

### Database (Supabase PostgreSQL)

Schema is in `supabase_schema.sql`. Key tables:

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — stores `full_name`, `phone`, `avatar_url`, `role` |
| `appointments` | Booking records with `service_id`, `barber_id`, `appointment_date`, `status` |
| `audit_logs` | Admin action trail (`executor_id`, `action`, `target_user`) |

Row-level security is enabled on all tables. The `is_admin()` SQL function is used in RLS policies. A trigger (`on_auth_user_created`) auto-creates a profile row on signup.

Test users are seeded via `seed_users.mjs` (admin: `medinajd205@gmail.com` / `123456`, client: `jdmedina205@gmail.com` / `123456`).

### i18n

`lib/i18n/dictionaries.ts` holds a hardcoded EN/ES dictionary. The active locale is stored in a cookie (`NEXT_LOCALE`).

### Path alias

`@/*` maps to the repo root (configured in `tsconfig.json`).

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Dark theme only — black background with amber (`#fbbf24`) accents. Use `cn()` from `lib/utils.ts` (`clsx` + `tailwind-merge`) for conditional class names.

### Key libraries

- `framer-motion` — animations and transitions
- `react-day-picker` — calendar in the booking wizard
- `date-fns` — date utilities
- `lucide-react` — icons
- `zod` — schema validation
- `browser-image-compression` — client-side avatar compression before upload to Supabase Storage
