# Rebate Calculator

PKSF মাইক্রোফাইন্যান্সের অগ্রিম কিস্তি রিবাট ক্যালকুলেটর। Jagoron, Agrossor, Buniyed, Sufolon এবং MFCE প্রোডাক্টের জন্য ২৯৯টি ডিফল্ট রেট, অ্যাডমিন রেট/Duration/টেক্সট ব্যবস্থাপনা, ভিজিটর নাম গেট ও অ্যাডমিন ভিজিটর রিপোর্ট, এবং অফলাইন PWA সুবিধা রয়েছে।

- **GitHub:** https://github.com/azahar4bd/Rebate
- **বিদ্যমান লাইভ ঠিকানা:** https://rebate-bkf.vercel.app
- **স্ট্যাক:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL/Neon
- **Source:** Google Drive-এর `Rebate` ফোল্ডারের নির্বাচিত `rebate.zip`; GitHub/Vercel build ও নিরাপত্তার প্রয়োজনীয় সংশোধনসহ।

- **ভিজিটর নাম গেট:** অ্যাডমিন লগইন ছাড়া প্রথম ব্যবহারে ভিজিটরকে নাম লিখতে হয়; নাম localStorage-এ থাকায় পরবর্তী বিজিটে আবার বলা হয় না।
- **ভিজিটর রিপোর্ট:** অ্যাডমিন **Visitors** panel-এ কারা কতবার এসেছে, কতবার হিসাব করেছে এবং শেষ কোন প্রোডাক্ট/মেয়াদ/কিস্তি ব্যবহার করেছে তা দেখা যায়; চাইলে রেকর্ড মুছেও ফেলা যায়।

## লোকাল সেটআপ

Node.js **22.x** এবং npm প্রয়োজন।

```bash
npm ci
cp .env.example .env.local
# .env.local-এ নিজের DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET সেট করুন
npm run dev
```

অ্যাপ port 3000-এ সব interface-এ listen করে। Browser-facing API request একই origin-এর `/api/...` ব্যবহার করে।

### Environment variables

| নাম | কাজ |
|---|---|
| `DATABASE_URL` | PostgreSQL/Neon connection string; Neon থেকে দেওয়া TLS parameters রাখুন |
| `ADMIN_PASSWORD` | নিজের শক্তিশালী, অনন্য অ্যাডমিন পাসওয়ার্ড |
| `AUTH_SECRET` | Cookie signing-এর জন্য random secret; অন্তত ৩২ random bytes সুপারিশ করা হয় |

`DATABASE_URL` build-এর সময় প্রয়োজন হয় না, কিন্তু **runtime-এ রেট ও সংরক্ষিত টেক্সট ব্যবহারের জন্য প্রয়োজন**। অ্যাডমিনের দুটি variable-এর কোনোটি অনুপস্থিত হলে login/edit বন্ধ থাকে; কোনো default password বা fallback signing secret নেই।

নিজের কম্পিউটারে secret তৈরি করতে পারেন:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

সত্যিকারের পাসওয়ার্ড, database URL বা API token GitHub, README অথবা চ্যাটে দেবেন না। `.env*` Git-এ ignored; শুধু ফাঁকা `.env.example` রাখা হয়েছে। অ্যাপের runtime-এ Vercel বা Neon management API token প্রয়োজন নেই।

## ডাটাবেস সেটআপ

বিদ্যমান production ডাটাবেসের backup নিন। তারপর schema **পর্যালোচনা করে** প্রয়োগ করুন:

```bash
# drizzle-kit নিজে .env.local পড়ে না; DATABASE_URL shell-এ export করুন
# অথবা gitignored .env ফাইলে DATABASE_URL রাখুন।
npm run db:push
```

স্কিমার টেবিল: `rebate_rates`, `site_content` এবং `visitors`। টেবিল তৈরি হওয়ার পর প্রথম page request-এ খালি rate table-এ ২৯৯টি default row seed হয়। বিদ্যমান data মুছতে বা overwrite করতে হয় না। `Restore Defaults` আলাদা destructive admin action; কেবল প্রয়োজন হলে ব্যবহার করুন। `visitors` টেবিল app নিজেই প্রথম ব্যবহারে auto-create করে (idempotent runtime bootstrap); চাইলে `db:push`-ও চালানো যায়।

## পরীক্ষা ও production build

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`package-lock.json` deterministic installation নিশ্চিত করে। GitHub Actions pull request ও `main`-এ validation চালায়। Tests authentication, anonymous write protection, গণনা, default data এবং PWA assets যাচাই করে; প্রকৃত Neon credentials ছাড়াই চলে। Production database connectivity আলাদাভাবে `/api/health` দিয়ে পরীক্ষা করতে হবে।

## আপনার বিদ্যমান Vercel অ্যাপকে GitHub-এর সঙ্গে যুক্ত করা

**নতুন project তৈরি করার প্রয়োজন নেই।** বিদ্যমান GitHub/Vercel integration-এর project name `rebate`; ZIP-এর পুরোনো নথিতে নাম ছিল `rebate-calculator`। Vercel bot-এর ফেরত দেওয়া project ID পুরোনো নথির ID-এর সঙ্গে মিলেছে, এবং নতুন preview-এর database health check সফল হয়েছে। একই project-এর বিদ্যমান Git সংযোগ দিয়েই deployment হচ্ছে। সংযোগ যাচাই বা পুনরায় সেট করার দরকার হলে `rebate-bkf.vercel.app`-এর project খুলুন ও **Domains** পরীক্ষা করুন।

1. Vercel Dashboard → সঠিক project → **Settings → Git**।
2. **Connect Git Repository** → GitHub-এর **`azahar4bd/Rebate`** নির্বাচন করুন। Repository না দেখা গেলে Vercel GitHub App-কে এই repo-র access দিন।
3. Production Branch: **`main`**। Root Directory: repository root (`./`; dashboard-এ ফাঁকা root-ও ঠিক)।
4. Framework: **Next.js**; Node.js: **22.x**; Install: **`npm ci`**; Build: **`npm run build`**; Output Directory: Next.js-এর default, override নয়। `vercel.json` framework/install/build settings রাখে, কিন্তু নিজে account বা Git connection তৈরি করে না।
5. **Settings → Environment Variables**-এ উপরের তিনটি variable দিন। Production-এ রাখুন; Preview deploy প্রয়োজন হলে Preview-তেও দিন। Preview-তে production-এর পরিবর্তে আলাদা test database/password ব্যবহার করুন।
6. Git সংযোগ থাকলে `main`-এ merge হলেই স্বয়ংক্রিয় production deploy হবে। Environment variables পরিবর্তনের পরে সর্বশেষ `main` production deployment থেকে **Redeploy** করুন; পুরোনো deployment-এর পুরোনো source নয়।
7. deployment **Ready** হলে https://rebate-bkf.vercel.app এবং `/api/health` পরীক্ষা করুন। Health JSON-এর `ok: true` database connectivity বোঝায়। Vercel system variable পাওয়া গেলে `commit` field-এ deployed Git SHA-ও থাকে; calculator-এ রেট আসা schema/data setup-ও নিশ্চিত করে।

Vercel Git integration ও environment variables account-level settings; শুধু source push/merge দিয়ে সেগুলো বদলানো যায় না। বিদ্যমান domain বা database পরিবর্তন করার প্রয়োজন নেই।

## দৈনন্দিন কাজ

- **টেক্সট পরিবর্তন:** admin login → **Content** → edit → **Save Changes**।
- **রেট যোগ/এডিট/ডিলিট:** **Rate Database**; write operations শুধু admin-এর জন্য।
- **Duration rename/delete:** **Rate Database → Durations**। Delete সেই duration-এর রেটও সরায়।
- **ভিজিটর রিপোর্ট:** admin login → **Visitors**। Refresh দিয়ে তাজা data; Trash আইকনে দু-ধাপ confirm-এ রেকর্ড delete।
- **Default rates restore:** admin → **Restore Defaults**; আগে backup রাখুন।
- **অফলাইন:** আগে online অবস্থায় অ্যাপ খুলতে হবে, যাতে public data/assets cache হয়। Admin session কখনো service-worker cache-এ রাখা হয় না।

## সমস্যা সমাধান

- **Build failed:** framework/root/build command এবং Node version পরীক্ষা করুন; deployment logs দেখুন।
- **রেট আসছে না:** `DATABASE_URL`, Neon connectivity, schema এবং `/api/health` দেখুন। Production-এ localhost database URL ব্যবহার করবেন না।
- **Admin login 503:** `ADMIN_PASSWORD` ও `AUTH_SECRET` দুইটিই সেট করে redeploy করুন।
- **পুরোনো UI:** নতুন deployment Ready হয়েছে কি না দেখুন। Service worker online visit-এ HTML refresh করে; প্রয়োজন হলে browser site data clear করুন।
- **Password পরিবর্তন:** Vercel env-এ বদলে redeploy করুন। পুরোনো sessions বাতিল করতে `AUTH_SECRET`-ও rotate করুন।

বিস্তারিত architecture: [HANDOVER.md](HANDOVER.md)। সংক্ষিপ্ত নির্দেশনা: [QUICKSTART.md](QUICKSTART.md)।
