# Top Dawg FE Smart Quote

A final-expense quoting and case-placement platform for licensed life-insurance
agents. An agent enters basic client information, answers a short dynamic health
interview, and gets a **Super Quote** — a ranked comparison across carriers with
the likely benefit classification, the monthly premium, the reason for each
ranking and a backup carrier.

> **The system never promises or guarantees approval.** Results are a
> pre-qualification guide. The carrier makes the final underwriting decision on
> every case, and every screen says so.

---

## Status of carrier data

**No real carrier rates or underwriting rules are in this repository.**

The eight carriers below ship as **inactive placeholders** — a name, a slug and
a note describing the documentation still needed. They have no products, no
rates, no state footprint and no underwriting rules, because none of that has
been verified yet:

Mutual of Omaha · Aflac · CICA Life · AIG / Corebridge · InstaBrain ·
Combined Insurance · American Amicable · Royal Neighbors of America

One extra carrier, **“Sample Mutual (FICTIONAL)”**, is seeded when
`SEED_DEMO_CARRIER=true`. Everything about it is invented so the engine can be
exercised end to end. Its rows carry `is_fictional_sample = true` and the UI
labels them as fictional wherever they appear. Delete it before production use.

---

## Quick start

Requirements: **Node 20+** (22 recommended) and **PostgreSQL 14+**.

```bash
# 1. Install
cd top-dawg-fe-smart-quote
npm install

# 2. Configure
cp .env.example .env
# Edit .env: point DATABASE_URL at your PostgreSQL instance and set a real
# AUTH_SECRET:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Create the database (if it does not exist yet)
createdb topdawg
createdb topdawg_test      # only needed to run the integration tests

# 4. Apply migrations and seed
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev                # http://localhost:3000
```

Then:

- **Quote tool** — <http://localhost:3000/quote>
- **Admin area** — <http://localhost:3000/admin>, signing in with
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`
  (defaults: `admin@topdawg.local` / `ChangeMe!2024` — change these).

### No Postgres installed?

```bash
docker run --name topdawg-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres -p 5432:5432 -d postgres:16
docker exec -it topdawg-pg psql -U postgres -c 'create database topdawg'
docker exec -it topdawg-pg psql -U postgres -c 'create database topdawg_test'
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Full suite (unit + integration) |
| `npm run test:unit` | Pure engine tests — no database needed |
| `npm run test:integration` | Database-backed tests (needs `TEST_DATABASE_URL`) |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed admin, carrier placeholders, health questions |
| `npm run db:reset` | Drop and recreate the schema (development only) |
| `npm run db:studio` | Drizzle Studio |

---

## How it works

### Three steps

1. **Client basics** — state, age (or date of birth, which is converted to an
   age and then discarded), sex, tobacco use, coverage from $3,000 to $25,000,
   and an optional monthly budget.
2. **Smart health interview** — a universal question set covering confinement,
   ADLs, pending tests, cardiac, cancer, diabetes, respiratory, kidney, liver,
   neurological, HIV, transplant, mental health, substance use, build and
   medications. Follow-ups appear **only** when a gate answer makes them
   relevant, so a healthy client answers about sixteen questions and stops.
3. **Super Quote** — ranked results with carrier, product, benefit type,
   coverage, monthly premium, approval-confidence category, the recommendation,
   the underwriting concern and an application link.

Result categories: *Strong level-benefit match · Possible level-benefit match ·
Likely graded · Guaranteed issue only · Do not submit — likely ineligible ·
Requires underwriting verification*.

### The rules engine

Deterministic and database-driven. **No language model decides eligibility.**
The pipeline is:

1. **Availability** — carrier/product activation, state, issue age, face
   minimum, maximum, age-banded caps, increment, tobacco class.
2. **Hard knockouts** — verified `decline` rules.
3. **Classification** — the most restrictive benefit ceiling the verified rules
   permit. A product that cannot issue that classification is marked *Do not
   submit* and the carrier's graded or guaranteed-issue plan surfaces instead.
4. **Rate lookup** — exact rate-table row, or “Rate unavailable”.
5. **Ranking** — underwriting eligibility → level-benefit availability →
   approval confidence → client value → monthly premium → application
   simplicity. **Agent compensation is not stored anywhere in the system, so it
   cannot influence ranking.**

Every rule carries carrier, product, state, category, condition, treatment,
lookback, result, benefit classification, source document, source page,
effective date, last-reviewed date, version and verification status — and the
explanation shown to the agent is the stored text of the rule that drove the
result.

**The engine refuses to guess.** It returns *Requires underwriting verification*
when:

- a rule that could change the outcome depends on an unanswered question;
- two equally specific verified rules disagree;
- a rule matches but is draft, expired or not yet effective (it is never
  applied, and the fact that it exists is reported);
- the client reports a condition the carrier has no verified rule for.

Criteria use a small tri-state DSL evaluated as true / false / **unknown**:

```json
{ "all": [
  { "fact": "diabetes.treatment", "op": "in", "value": ["insulin", "pills_and_insulin"] },
  { "fact": "diabetes.insulinStartAge", "op": "lt", "value": 30 }
] }
```

Operators: `eq ne in nin lt lte gt gte exists not_exists contains_any
contains_none`. Groups: `all`, `any`, `none`, nestable. A fact the interview
never established is `unknown`; a fact ruled out by a "no" gate answer is
*known absent*, which is what keeps a healthy client from tripping verification
on conditions they do not have.

### The rate engine

Premiums are looked up by carrier → product → state → benefit type → age → sex →
tobacco class → face amount → rate-table effective date. Only **published**
tables are read.

- No interpolation, no estimation, no averaging. If there is no exact verified
  row, the result is **“Rate unavailable”** — never an invented price.
- The one exception is a product explicitly configured with
  `rateMethodology = per_thousand` **and** `allowInterpolation = true`, which
  should be set only when the carrier's own documentation defines a per-$1,000
  calculation.
- A monthly policy fee, where the carrier charges one, is added to the row.

### Admin area

Signed-in administrators can add and edit carriers and products, activate and
deactivate them, configure states, age ranges, face limits and increments,
import rate tables from CSV, write health questions and conditional follow-ups,
create underwriting and medication rules, reference source documents, set
effective dates, mark rules draft / verified / expired / archived, preview a
quote against unpublished configuration, and publish a verified carrier module.

Guarantees the admin layer enforces:

- **Imports land in draft.** A rate table is invisible to the engine until an
  administrator publishes it.
- **Published rules are never silently replaced.** Editing a verified rule
  snapshots the old version, bumps the version number and returns the rule to
  draft until it is verified again.
- **Full version history with rollback.** Rolling back restores an earlier
  version's content as a new draft; nothing is deleted.
- **A carrier cannot go live until it passes every publish check** — source
  documents, products, state availability, verified rules and a published rate
  table.
- **Everything is audited** — who, what, when, and which version was published.

#### Rate CSV format

```csv
age,sex,tobacco_class,face_amount,monthly_premium,annual_premium,rate_per_thousand
65,female,non_tobacco,10000,42.18,,
65,male,tobacco,10000,61.40,,
```

- `sex`: `male` / `female` / `unisex` (aliases `m`, `f`, `u` accepted)
- `tobacco_class`: `tobacco` / `non_tobacco` / `unismoke`
  (aliases `t`, `nt`, `smoker`, `nonsmoker`, `standard`, `composite`)
- `annual_premium` and `rate_per_thousand` are optional; `$` and thousands
  separators are tolerated
- `face_amount = 0` is reserved for per-$1,000 rows and requires
  `rate_per_thousand`
- Bad rows are reported by line number, never silently dropped

---

## Security and privacy

- **Minimal client data.** The quote flow collects state, age, sex, tobacco use,
  coverage, an optional budget and health answers. It does **not** collect or
  store names, Social Security numbers, banking details, beneficiaries or
  contact information — the intake validator drops unknown fields, and the
  answers endpoint discards any key that is not a real question code.
- **Anonymous sessions.** Each quote is a random 21-character ID with an
  automatic expiry (`QUOTE_RETENTION_DAYS`, default 30 days). A date of birth,
  if entered, is converted to an age and never persisted.
- **Protected admin.** bcrypt password hashes, HTTP-only signed session cookies
  (HS256), a per-user `tokenVersion` for instant session revocation, login
  throttling, and server-side re-validation of every payload.
- **Audit log.** Every administrative change records actor, action, entity,
  version, before/after snapshot and timestamp.

---

## Testing

```bash
npm run test:unit          # ~100 pure engine tests, no database
npm test                   # everything, including database-backed tests
```

Covered: state availability · age eligibility · minimum and maximum coverage ·
coverage increments · age-banded face caps · tobacco rates · level versus graded
classification · hard knockout rules · conditional health questions · fact
extraction · missing information · conflicting rules · carrier ranking · best
and backup selection · draft, expired and unverified rules · exact rate-table
matching · rate unavailability · CSV import and publishing · rule versioning,
rollback and audit · intake validation and PII rejection.

Sample test clients live in `tests/integration/quote-flow.test.ts` and
`tests/fixtures/sample-carriers.ts`. **Every carrier, rate and underwriting
decision in the tests and fixtures is fictional** and is labelled as such.

---

## Project layout

```
src/
  app/                    Next.js App Router — pages and API routes
    quote/                Three-step agent flow
    admin/                Carrier, product, rule, question, audit, preview
    api/                  Server-side endpoints (all validated with zod)
  components/
    quote/                Wizard, dynamic question fields, results
    admin/                Forms, state grid, CSV import, action buttons
  db/
    schema.ts             All 16 tables
    seed.ts               Admin, carrier placeholders, questions, demo carrier
    seed-data/            Health interview + fictional demo carrier
  modules/
    auth/                 Password hashing, session cookies, RBAC
    intake/               Step 1 validation
    questionnaire/        Branching + fact extraction
    engine/               Pure rules engine: criteria, availability,
                          underwriting, rates, ranking
    catalog/              Database → engine repository
    carriers/             Readiness checks and module publishing
    rules/                Rule lifecycle, versioning, rollback
    rates/                CSV import and publishing
    audit/                Audit log
    quote/                Anonymous quote sessions
  lib/                    Constants, API helpers, admin guard
drizzle/                  Generated SQL migrations
tests/                    Unit (pure) and integration (database) tests
```

---

## Deployment

Full instructions, including the three hosting options and what is **not** set
up, are in **[DEPLOYMENT.md](./DEPLOYMENT.md)**. The short version:

```bash
cp .env.example .env          # set AUTH_SECRET, SEED_ADMIN_PASSWORD, POSTGRES_PASSWORD
npm run docker:up             # app + Postgres
npm run docker:migrate
npm run docker:seed
npm run docker:load-carriers
```

Or deploy to Vercel with **Root Directory** set to `top-dawg-fe-smart-quote` —
this app is a subdirectory, and the repository root holds a different project.

Two things worth knowing before it is reachable from the internet:

- **The server refuses to start in production** if `AUTH_SECRET` is missing,
  too short or still the example value, if `DATABASE_URL` points at localhost
  or lacks TLS, or if `SEED_DEMO_CARRIER` is `true`. An unprotected admin area
  is not a warning-level problem. `GET /api/health` reports the same findings
  by variable name — never by value — and returns 503 while any of them stand.
- **A fresh deployment quotes nothing.** Every carrier, rule and rate table
  loads as draft / inactive and stays that way until a licensed reviewer
  publishes it from `/admin/carriers/[id]/review`.

---

## Deliberately not in this MVP

Named-agent carrier routing · agent compensation calculations · IMO commission
tracking · lead distribution · client banking collection · full carrier
applications · automatic carrier submissions · any claim of guaranteed approval ·
subscription billing.

The schema already carries `users.role` (`admin` / `agent`), so agent accounts
and, later, subscriptions can be layered on without reshaping anything.
