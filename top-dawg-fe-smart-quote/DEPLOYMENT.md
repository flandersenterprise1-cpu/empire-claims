# Deploying Top Dawg FE Smart Quote

This app lives in `top-dawg-fe-smart-quote/`, a subdirectory of a repository
whose root holds a different, unrelated project (Empire Claims Group). Every
command below runs from **this** directory, and any host you point at the
repository must be told the same — a host pointed at the repository root will
build the other app.

## Before anything else

The platform stores health answers about real people. Two settings decide
whether that is safe, and the server refuses to start in production without
them:

```bash
# A real secret. Anyone who knows it can forge an admin session.
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

- `AUTH_SECRET` — at least 32 characters, not the value in `.env.example`
- `SEED_ADMIN_PASSWORD` — not the example value
- `DATABASE_URL` — not localhost, and `?sslmode=require` unless the database
  is on a private network
- `SEED_DEMO_CARRIER` — must not be `true`; it seeds a FICTIONAL carrier with
  invented rates

`GET /api/health` reports the same findings by variable **name**, never by
value, and returns 503 while anything is wrong.

---

## Option A — Docker Compose (app + database, one command)

Best when you want the whole thing running on one box, or locally.

```bash
cp .env.example .env
# edit .env: AUTH_SECRET, SEED_ADMIN_PASSWORD, POSTGRES_PASSWORD

npm run docker:up              # builds the image and starts app + Postgres
npm run docker:setup           # schema, admin, carriers, and goes live

curl localhost:3000/api/health
```

`setup` leaves a working quoter: it migrates, seeds, loads every carrier, and
activates the three whose rates reproduce the carrier's own published figures
(Transamerica, American Amicable, Combined). Carriers whose rates are not
verified yet are loaded but not quoted, and it prints which. Re-running it is
safe.

The database is deliberately **not** published to the host — only the app
container can reach it. Add a `ports` mapping to `docker-compose.yml` if you
need `psql`, and take it out again afterwards.

`npm run docker:logs` follows the app; `npm run docker:down` stops everything
and keeps the data volume.

## Option B — Vercel (managed, free tier is enough to start)

Next.js is Vercel's own framework, so this is the shortest path to a URL.

1. Import the repository, and set **Root Directory** to
   `top-dawg-fe-smart-quote`. This is the step people miss; without it Vercel
   builds the other project at the repository root.
2. Add a Postgres database — Vercel Postgres, [Neon](https://neon.tech) and
   [Supabase](https://supabase.com) all have free tiers. Copy its pooled
   connection string into `DATABASE_URL`, keeping `?sslmode=require`.
3. Set the environment variables listed above for the Production environment.
4. Deploy. Then run the schema and seed against the same database from your
   machine:

   ```bash
   DATABASE_URL="<the production url>" npm run setup
   ```

`vercel.json` pins the framework and install command; it does not pin the root
directory, which is a project setting.

## Option C — any Node host

```bash
npm ci
npm run build
npm run start:standalone     # serves .next/standalone/server.js on $PORT
```

`output: 'standalone'` traces exactly the modules the server imports, so the
runtime needs no `node_modules`. Copy `.next/static` and `public` next to
`server.js` — the Dockerfile shows the layout.

---

## After the first deploy

`npm run setup` leaves the site quoting from three carriers. Then:

1. Sign in at `/admin` with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, and
   **change the password**.
2. Send `/quote` to your agents.
3. As more carriers' rates arrive, import them and activate the carrier from
   `/admin`. Rules can be reviewed in bulk at
   `/admin/carriers/[id]/review`, each shown against the source page it cites.

## Upgrades

```bash
DATABASE_URL="<production url>" npm run db:migrate
```

Migrations are additive and are applied in order. Published rules and rate
tables are versioned, so a bad import can be rolled back rather than undone by
hand.

## What is NOT set up

- **`/quote` is open to anyone with the link.** That is the current intent:
  share the URL and agents can quote immediately, no accounts to manage. No
  client-identifying data is collected or stored, so nothing personal is
  exposed -- but your carrier lineup and pricing are visible to whoever has
  the link. The role column and session handling already exist, so gating it
  behind agent sign-in later is a small change.
- **No backups.** Configure them on whichever database you choose.
- **No custom domain or TLS termination** beyond what the host provides.
- **No error reporting service.**
