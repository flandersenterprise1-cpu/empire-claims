# Empire Claims Group

Premium public website **and** back-office Claims Management CRM for Empire Claims
Group, a California public adjusting firm (License No. 2N60148).

This project was originally built on the Manus platform and has been migrated to
a fully self-contained codebase that builds and runs from GitHub — no platform
lock-in.

## What's inside

- **Public website** (`/`, `/about`, `/services`, `/claims`, `/faq`, `/contact`) —
  dark luxury marketing site with a free-claim-review form that saves inquiries
  to the database.
- **Back office** (`/admin`) — secure, role-based claims management: dashboard,
  claims pipeline, inspections, adjusters, documents, tasks, analytics, and
  settings.

## Tech stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Frontend  | React 18, Vite, wouter, TanStack Query, Framer Motion, Recharts |
| API       | tRPC v11 over Express                                   |
| Database  | MySQL via Drizzle ORM                                   |
| Auth      | Username/password (bcrypt) with signed JWT session cookies |
| Storage   | Local disk (`/uploads`), pluggable for S3/R2           |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env — at minimum set JWT_SECRET and DATABASE_URL
```

### 3. Start a database (optional but needed for the CRM)

A local MySQL is provided via Docker:

```bash
docker compose up -d
```

Then create the tables:

```bash
npm run db:push
```

> The public website runs fine **without** a database. The admin CRM requires
> `DATABASE_URL` to be set.

### 4. Create the first admin

Either run the seed script:

```bash
npm run seed:admin -- admin "your-strong-password" "Your Name"
```

…or just open `/admin` in the browser — on first run it shows a one-time setup
form to create the initial admin account.

### 5. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 for the website and http://localhost:3000/admin for
the back office.

## Available scripts

| Script                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server (Express + Vite HMR)          |
| `npm run build`       | Build the client into `dist/`                      |
| `npm start`           | Run the production server (serves `dist/`)         |
| `npm run typecheck`   | TypeScript type checking                           |
| `npm test`            | Run the test suite (Vitest)                        |
| `npm run db:push`     | Push the Drizzle schema to the database            |
| `npm run db:studio`   | Open Drizzle Studio                                |
| `npm run seed:admin`  | Create the first admin account                     |

## Deploying

1. Provision a MySQL database and set `DATABASE_URL`, plus a strong `JWT_SECRET`.
2. `npm ci && npm run build`
3. `npm start` (serves the built site and the API on `PORT`, default 3000).

Any host that runs Node.js works (Render, Railway, Fly.io, a VPS, etc.). For
uploaded documents to persist across deploys, point `UPLOAD_DIR` at a mounted
volume or swap `server/storage.ts` for cloud object storage.

## User roles

- **admin / manager** — full access to all claims, users, and settings.
- **adjuster** — staff access to claims, inspections, tasks, and documents.

## Project layout

```
src/            React front end (pages, components, hooks)
server/         Express + tRPC API, database access, auth
  _core/        Framework glue: tRPC context, cookies, auth, notifications
drizzle/        Database schema (Drizzle ORM)
shared/         Constants shared by client and server
scripts/        Operational scripts (admin seeding)
docs/           Original product spec and design notes
```
