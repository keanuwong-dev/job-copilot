# Job Tracker

Personal job-application autofill and tracker. The Chrome extension fills employer application forms from a profile file. You review every field and submit yourself. A Next.js app tracks applications. Gmail updates statuses later.

## Status

Phase 7 can draft long answers and classify emails the rules do not recognize. Both stay off until `AI_ENABLED=true`. Nothing clicks Submit or Save and Continue. Do not commit `profile.yaml`, `resume.pdf`, or `.env.local`.

## Requirements

- Node.js 20 or newer
- pnpm 12
- Chrome, for the extension
- Docker and the Supabase CLI, when you apply the migration to a real project. Tests apply it locally without Docker.

## Scripts

From the repo root:

```bash
pnpm install
pnpm dev                         # Next.js app at http://localhost:3000
pnpm --filter extension dev      # WXT dev build; opens Chrome with the extension
pnpm test
pnpm lint
pnpm format
```

`pnpm --filter web dev` is the same as `pnpm dev`. The extension dev server uses port 3001 so it can run next to the web app.

## Layout

```
apps/web            Next.js tracker
apps/extension      WXT Chrome extension
packages/shared     Profile schema, classifier, and database types
supabase/migrations Initial Postgres migration
profile.example.yaml
```

`apps-script/Code.gs` is pasted into a personal Google Apps Script project. It is not deployed from this repo.

## Environment

Copy `apps/web/.env.example` to `apps/web/.env.local` when Supabase is connected. Leave the values blank until then. The app runs without them.

## Applying the database

When the Supabase project exists, run `supabase/migrations/20261110120000_init.sql` in the SQL editor, or `supabase db push` after linking the project. Row level security limits every table to `auth.uid() = user_id`.

## Phase 2 check

Without Supabase keys, `pnpm dev` redirects to `/login?error=config` and `POST /api/applications` returns 503. After the steps below, you can sign in, add an application, generate an API key, and create one with curl.

1. Create a Supabase project and enable email magic links.
2. Run `supabase/migrations/20261110120000_init.sql` in the SQL editor, or `supabase db push` after linking the project.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. In Auth URL configuration, allow `http://localhost:3000/auth/callback`.
5. Restart `pnpm dev`. Sign in, add an application, and generate a key on Settings. The secret is shown once.
6. Create and look up an application:

```bash
curl -sS -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"company":"Acme","role":"Engineer","job_url":"https://example.com/jobs/1"}'

curl -sS "http://localhost:3000/api/applications/lookup?url=https://example.com/jobs/1" \
  -H "Authorization: Bearer <key>"
```

A second POST with the same `job_url` returns the existing row, `created: false`, and HTTP 200. A new row returns 201.

## Phase 3 check

1. `pnpm --filter extension dev` reloads the extension in Chrome.
2. Open the extension’s options. Import `profile.yaml`, choose your resume PDF, paste the API key from the tracker Settings page, and set the tracker URL to `http://localhost:3000`. Save.
3. Open a Greenhouse application (`boards.greenhouse.io` or `job-boards.greenhouse.io`) or a Lever page whose URL ends in `/apply`.
4. Click **Autofill** (or press Alt+Shift+F). Filled fields get a green outline. Required fields with no confident answer get a yellow outline. The extension does not click Submit.
5. Use **Log application** in the panel or popup. The tracker shows the row. A second log for the same URL says it is already there. Revisiting the page shows “Already applied”.

## Phase 4 check

1. Open http://localhost:3000/answers. Add a question and answer, edit it, and delete one you do not want.
2. Reload the extension on `chrome://extensions` if it was already loaded. Keep `pnpm dev` and `pnpm --filter extension dev` running.
3. On a Greenhouse or Lever application, type your own reply into a free-text question and click away. Choose **Save answer for similar questions?** The question shows up on the Answers page.
4. On another employer application page (not LinkedIn or Indeed), click the extension icon and **Autofill this page**. The extension matches labels only. It does not appear by itself, and it does not click Submit.
5. Confirm the popup refuses LinkedIn and Indeed.

The extension still does not inject a content script on LinkedIn, Indeed, or other job boards.

## Phase 6 check

Reload the extension on `chrome://extensions` after `pnpm --filter extension dev` rebuilds. Ashby and Workday can be turned off in the extension options.

1. Open an application on `jobs.ashbyhq.com`. The panel appears on its own. Click **Autofill**. Contact fields, resume, yes/no buttons, and dropdowns that match the profile are filled. Uncertain questions stay empty with a yellow outline. The extension does not click Submit.
2. Open a Workday application on `*.myworkdayjobs.com` and wait until the current step’s fields are visible. Click **Autofill**. Only that step is filled.
3. Click **Save and Continue** yourself, then click **Autofill** again on the next step. Repeat until the last step. The extension does not click Save and Continue or Submit.
4. Use **Log application** on either site. The tracker shows Ashby or Workday as the platform.

## Phase 7 check

AI stays off unless `apps/web/.env.local` has `AI_ENABLED=true` and `AI_API_KEY`. Restart `pnpm dev` after changing them. With the flag off, **Draft answer** returns “AI is turned off” and email ingest keeps using the rules only.

1. Reload the extension on `chrome://extensions`.
2. Open an application with a long text question. A **Draft answer** button sits under the field. It writes a draft into the box for you to edit. It does not submit the form.
3. An email that matches none of the status phrases is sent to the model only when AI is on. A confident, unique match can update the tracker. A low-confidence result stays on Review.

## Phase 5 check

Gmail scanning needs a public URL. On localhost, use the curl below to confirm Review before you paste the Apps Script.

1. On Settings, generate a key named `Apps Script` and copy it. Add `CRON_SECRET` to `apps/web/.env.local` (any long random string) and restart `pnpm dev`.
2. Send yourself an email with the subject `Thank you for applying to Acme`. Leave it unread in the inbox you will authorize.
3. Confirm the ingest path locally:

```bash
curl -sS -X POST http://localhost:3000/api/email-ingest \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"gmail_message_id":"acme-test-1","from":"Acme <jobs@greenhouse.io>","subject":"Thank you for applying to Acme","snippet":"We received your application.","body":"We received your application.","received_at":"2026-11-10T20:00:00.000Z"}]}'
```

4. Open http://localhost:3000/review. The Acme email is listed when you do not already have exactly one open Acme application. If you do, the tracker updates that row and Review stays empty.
5. Open https://script.google.com and create a project. Paste `apps-script/Code.gs`. In Project Settings → Script properties, set `INGEST_URL` to `https://<your-deployment>/api/email-ingest` and `API_KEY` to the key from step 1. `localhost` is not reachable from Google.
6. Run `install`, authorize Gmail and external requests, then run `scan` once. After a 2xx response the script adds the Gmail label `jobtracker-processed`. A failed request is left unlabeled and retried in 15 minutes.
7. On the Review card, pick an application or create one, choose the status, and confirm. That updates the tracker.
8. Optional: `curl -sS http://localhost:3000/api/cron/ghosted -H "Authorization: Bearer <CRON_SECRET>"` marks Applied and OA rows with no activity for 30 days as Ghosted. On Vercel the same path runs daily at 8:00 Pacific (`0 16 * * *` UTC).

Classification is rules only. Offer, rejection, interview, assessment, and application confirmations can move a matched application forward. Anything else waits on Review. The script never clicks Submit and never reads LinkedIn or Indeed.
