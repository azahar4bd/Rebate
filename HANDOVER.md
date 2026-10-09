# Rebate Calculator — Handover

## পরিচিতি

PKSF মাইক্রোফাইন্যান্সের অগ্রিম কিস্তি rebate calculator।

- Repository: https://github.com/azahar4bd/Rebate
- বিদ্যমান production domain: https://rebate-bkf.vercel.app
- Formula: `Math.round((disburse / 1000) * rate)`
- Stack: Next.js 16 / React 19 / TypeScript / Tailwind 4 / Drizzle / Neon PostgreSQL / Vercel

## Source ও import

Google Drive-এর `Rebate` ফোল্ডারের **`rebate.zip`** নির্বাচিত source। Import-এর পরে lockfile, Vercel config, CI/tests, অনুপস্থিত PWA PNG icons এবং build/authentication সংশোধন যোগ হয়েছে। কোনো credentials import করা হয়নি।

## Architecture

```text
src/app/page.tsx                 server-side rates/content, initial seeding
src/app/api/auth/                login, logout, session
src/app/api/rates/               public read, admin create/update/delete/restore
src/app/api/durations/           public list, admin rename/delete
src/app/api/content/             public read, admin text updates
src/app/api/health/              runtime database connectivity (200 or 503)
src/components/Calculator.tsx   calculator and management UI
src/components/RateDatabaseModal.tsx
src/components/DurationManager.tsx
src/components/ContentEditor.tsx
src/components/OfflineIndicator.tsx
src/db/index.ts                 lazy getDb(), bounded pg pool, Neon URL normalization
src/db/schema.ts                rebate_rates, site_content
src/data/rebateData.ts          canonical 299 rates and sorting helpers
src/data/defaultContent.ts      fallback site text
src/lib/rate.ts                 serialization, formatting, calculation
src/lib/auth.ts                 signed admin cookie, strict expiry, no default secrets
public/                         manifest, icons, service worker
```

## Environment ও database

Runtime-এ শুধু `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET` প্রয়োজন। Vercel/Neon API management tokens অ্যাপের প্রয়োজন নেই। বাস্তব credentials কেবল `.env.local`/`.env` বা Vercel environment variables-এ রাখুন; Git/chat-এ নয়। বিস্তারিত [README.md](README.md)।

Database build-এর সময় initialize হয় না। Missing runtime database হলে health endpoint generic 503 ফেরত দেয়; request-time error production connection string প্রকাশ করে না। Tables তৈরি করতে `DATABASE_URL` shell-এ export করে বা `.env`-এ রেখে `npm run db:push` চালান, proposed changes পর্যালোচনা করুন এবং production backup রাখুন। `.env.local` Drizzle CLI নিজে লোড করে না।

- `rebate_rates`: unique `(product, duration, kisti)`, numeric rate, timestamps
- `site_content`: unique text key/value, timestamp
- খালি rate table-এ প্রথম page load default rates seed করে; data থাকলে seed করে না।
- `Restore Defaults` বর্তমান rates মুছে দেয়—এটি intentional destructive admin action।
- Neon-এর `channel_binding` parameter pg driver-এর জন্য সরানো হয়; Neon TLS verification থাকে।

## Authentication

`POST /api/auth/login` accepts `{ "password": "..." }`। Server env-এর সঙ্গে যাচাই করে HMAC-SHA256 signed `rebate_admin_session` cookie দেয়। Cookie HTTP-only, SameSite=Lax, production-এ Secure, মেয়াদ ৭ দিন।

Configured password ও signing secret ছাড়া login **503**, writes **401**। Token-এর valid signature, numeric future expiry এবং `role: admin` প্রয়োজন। Anonymous rate/content/duration writes নিষিদ্ধ। Auth responses no-store; service worker auth endpoints cache করে না। Password পরিবর্তনের পরে সব পুরোনো sessions বাতিল করতে signing secret-ও rotate করুন।

## Data / UI

- Products: Jagoron → Agrossor → Buniyed → Sufolon → MFCE
- Default durations: Week → 1 Year → 1.5 Year → 2 Year; নতুন duration শেষে
- Duration admin-managed; product validation fixed list-এর বিরুদ্ধে হয়।
- Deleted kisti আর selected/calculated থাকে না; selection derived from current rates।
- Modal contents open থাকা অবস্থায় mount হয়; reopen-এ transient state reset হয়।

## PWA

`public/sw.js`: public `/api/rates` ও `/api/content` network-first; immutable Next assets/icons cache-first; navigations network-first, offline cached home fallback। Auth/health/private API requests cache নয়। localStorage-এ public rates/content cache থাকে।

`public/manifest.json`-এ 192px ও 512px PNG icons রয়েছে, SVG-ও source হিসেবে রাখা হয়েছে। Static precache পরিবর্তন করলে service-worker cache version bump করুন।

## Validation / deploy

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions PR ও main-এ একই checks চালায়। Tests কোনো real production database ব্যবহার করে না। DB connectivity/CRUD live-check environment-specific; health ও calculator দিয়ে যাচাই করুন।

**Vercel:** সঠিক project-এর **Domains**-এ `rebate-bkf.vercel.app` থাকা নিশ্চিত করুন, তারপর **Settings → Git → azahar4bd/Rebate**, production branch `main`, repo root, Next.js, Node 22.x। আগের ZIP-এর project name ছিল `rebate-calculator`; GitHub-এর আলাদা `rebate` deployment-এর সঙ্গে গুলিয়ে ফেলবেন না। Config file GitHub App/account settings পরিবর্তন করে না। তিনটি runtime variables dashboard-এ রাখুন, সর্বশেষ main source deploy করুন।
