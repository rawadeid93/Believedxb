# BELIEVE PERFORMANCE — Core Member Loop (v0.1)

This is a real, working app, not a mockup. Follow this in order — each step
depends on the one before it. Total time: about 20 minutes the first time.

---

## What's built right now

- Sign up / sign in
- Member Dashboard — week X of 8, streak, commitment points, block completion %, today's workout
- Today's Workout — every exercise with sets/reps/tempo/rest/coach notes
- Logging — weight, reps, time, distance, calories, RPE, notes, saved automatically as you type (no save button)
- **LAST WEEK** reference shown next to every exercise once you have a prior log for it
- Complete Workout button — updates your streak, commitment points, and block completion instantly
- Installable on your phone home screen (PWA) — opens full-screen like a native app

**Not built yet, on purpose** (per your instruction — we confirm this works first):
Travel Mode, the public leaderboard screen, badges, coach/admin dashboard, Program Builder,
attendance import. The database already has the scoring rules table and hooks for these — see
the architecture doc — so none of this is a rebuild, just the next screens.

---

## What is real vs. sample data

| Real (from your input) | Sample (seeded so you can test) |
| --- | --- |
| Weekly schedule: Mon Lower / Tue Engine / Wed Upper / Thu Engine / Fri Full Body / Sat Conditioning / Sun HYROX | The specific exercises, sets, reps and coach notes in Weeks 1–2 — placeholder BELIEVE-style programming so there's something real to log against |
| 8-week block structure | Weeks 3–8 exist as empty shells (right days/types, no exercises yet) |
| Scoring logic: 5 pts per workout logged, +20 bonus for a perfect week | The point values themselves — easy to change in one SQL table once you tell me the real numbers |
| Streak logic: consecutive training days, one rest day tolerated | Your own account's starting streak/points, backfilled to 7 days so you can see it continue when you complete today's workout |

Once the core loop is confirmed, tell me the real Week 1–8 programming and I'll replace the
sample exercises with it.

---

## 1. Create your two free accounts

You need two accounts. Both are free at this scale (your ~100 members).

1. **Supabase** (the database + login system) — go to https://supabase.com, sign up, click
   "New Project". Pick any name (e.g. `believe-performance`), set a database password
   (save it somewhere), pick a region close to Dubai (e.g. `eu-central-1` or similar), click Create.
   Wait ~2 minutes for it to provision.
2. **Vercel** (hosting, gives you a real phone-testable URL) — go to https://vercel.com, sign
   up (you can use your GitHub account or email).

---

## 2. Set up the database

1. In your Supabase project, click **SQL Editor** in the left sidebar → **New query**.
2. Open `supabase/schema.sql` from this folder, copy the whole file, paste it in, click **Run**.
3. New query again → open `supabase/functions.sql`, copy, paste, **Run**.
4. New query again → open `supabase/seed.sql`, copy, paste, **Run**.

You now have the full 8-week block, exercises, and workouts in your database.

---

## 3. Get your API keys

1. In Supabase, click the gear icon → **API** (or **Project Settings → API**).
2. Copy the **Project URL** and the **anon public** key. You'll paste these in Step 5.
3. Also go to **Authentication → Providers → Email** (or **Sign In / Providers**) and, for
   fast testing, turn **Confirm email OFF**. (Leave it on later for real members — this just
   skips the confirmation email while you're testing on your own phone.)

---

## 4. Push this code to GitHub (so Vercel can deploy it)

If you already have a GitHub account:

1. Go to https://github.com/new, create a new **private** repo called `believe-performance`.
2. On your computer, unzip this project folder, then in a terminal inside it run:
   ```
   git init
   git add .
   git commit -m "BELIEVE Performance MVP core loop"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/believe-performance.git
   git push -u origin main
   ```
   (Replace `YOUR-USERNAME` with your GitHub username. If `git` isn't installed, GitHub Desktop's
   drag-and-drop upload works too — same result.)

---

## 5. Deploy on Vercel

1. In Vercel, click **Add New → Project**, choose **Import Git Repository**, pick `believe-performance`.
2. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` → paste your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → paste your Supabase anon public key
3. Click **Deploy**. Wait ~1–2 minutes.
4. You'll get a live URL like `https://believe-performance.vercel.app` — this works on any
   phone, anywhere, immediately.

---

## 6. Create your account and personalize it

1. Open your Vercel URL on your phone (or laptop first if easier).
2. Tap **New here? Create an account** — enter your name, email, a password. Submit.
3. If it doesn't take you straight to the dashboard, it means email confirmation is still on
   — go back and turn it off (Step 3), then sign in.
4. Back in Supabase **SQL Editor**: open `supabase/personalize_me.sql`, change
   `'you@example.com'` to the exact email you just signed up with, paste the whole file in, **Run**.
   This enrolls you in the block and backfills Week 1 as complete with a 7-day streak, so you
   land on Week 2 exactly like a real member mid-block.
5. Refresh the app. You should now see **Week 2 of 8**, a 7-day streak, and today's workout.

---

## 7. Test it for real

1. Open today's workout. Enter a weight/reps (or time/distance for Engine days) on the first
   exercise, then tap out of the field — it saves automatically, no button.
2. Since Week 1 is already logged, every exercise should show a **Last week: …** line.
3. Log all exercises, then tap **Complete Workout** at the bottom.
4. You should land on a completion screen showing your streak (now 8) and points earned.
5. Go back to the dashboard — completion %, streak, and points should all reflect it.

---

## 8. Put it on your phone's home screen

**iPhone (Safari):** open the Vercel URL → tap the Share icon → **Add to Home Screen**.
**Android (Chrome):** open the URL → tap the ⋮ menu → **Add to Home Screen** / **Install app**.

It opens full-screen with the BELIEVE icon, no browser bar — feels like a native app.

---

## If something breaks

- **"No member profile found"** — the signup trigger didn't fire. Re-run `schema.sql`
  (it's safe to re-run the trigger section) and try signing up again with a new email.
- **"You are not enrolled in a training block yet"** — run `personalize_me.sql` (Step 6.4).
- **Blank/white screen on Vercel** — almost always a missing or mistyped environment variable.
  Double-check Step 5.2 in Vercel → Project Settings → Environment Variables, then redeploy.
- Anything else — send me the exact error text on screen and I'll fix it.

---

## Known, accepted trade-off

`npm audit` flags a moderate/high advisory in PostCSS, which is a nested dependency of Next.js
itself (a build-time CSS tool, not something exposed to your members at runtime). Not a risk
at MVP stage; worth a routine `npm update` pass before the coach/admin build, once Next.js ships
the next patch.

Once you confirm this core loop works end to end on your own phone, say the word and I'll build
the Leaderboard, Travel Mode, and the Coach/Admin side next.
