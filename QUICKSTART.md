# Rebate — Quick Start

- **Repository:** https://github.com/azahar4bd/Rebate
- **Existing site:** https://rebate-bkf.vercel.app
- **Node:** 22.x

```bash
npm ci
cp .env.example .env.local
# Set DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET in .env.local.
npm run dev
```

Database schema: `npm run db:push` after exporting `DATABASE_URL` in your shell or putting it in gitignored `.env`. Review proposed schema changes; back up production first.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

**Vercel-এর existing project:** Domains-এ `rebate-bkf.vercel.app` দেখুন → Settings → Git → `azahar4bd/Rebate` connect → Production Branch `main` → root `./` → Next.js / Node 22.x → উপরের তিনটি env vars Production-এ সেট → সর্বশেষ main deploy। Preview-তে আলাদা test database ব্যবহার করুন।

Auth variables না থাকলে admin login বন্ধ থাকে। Runtime `DATABASE_URL` না থাকলে saved rates পাওয়া যাবে না, যদিও build সফল হবে। `/api/health` দিয়ে database connectivity পরীক্ষা করুন।

আসল credentials কখনো GitHub বা চ্যাটে দেবেন না। বিস্তারিত: [README.md](README.md) ও [HANDOVER.md](HANDOVER.md)।
