# Snowwords

Snowwords is a vocabulary-learning web app. Save words as you find them anywhere on the web, then reinforce them with quizzes, a review mode, a daily crossword, and an AI chat tutor.

## Features

- **Chrome extension** — select a word on any webpage and add it to your vocabulary list in one click (or with the `Ctrl+Shift+A` / `Cmd+Shift+A` shortcut), right from the [Snowwords extension](snowwords-chrome-extension).
- **Vocabulary review & testing** — a spaced review mode and a test mode for practicing saved words.
- **Daily crossword** — a crossword puzzle generated from the user's vocabulary, limited to one per day for free accounts.
- **AI chat tutor** — a Groq-powered chat assistant for practicing and asking about vocabulary.
- **Accounts & auth** — email/password login and Google OAuth via Passport, with session storage in Postgres.
- **Subscriptions** — free vs. premium plans managed through Stripe, with feature gating (message limits, test limits, game access) enforced server-side.
- **Admin panel** — usage stats, user management, feedback, and subscription data at `/admin`.
- **User feedback** — an in-app feedback form.

## Tech stack

- **Backend:** Node.js, Express, EJS templates
- **Database:** PostgreSQL (developed against Supabase), sessions stored via `connect-pg-simple`
- **Auth:** Passport (local + Google OAuth 2.0), bcrypt
- **Payments:** Stripe
- **AI:** Groq SDK
- **Security:** CSRF protection (csurf), rate limiting, `express-session`
- **Extension:** Manifest V3 Chrome extension (`snowwords-chrome-extension/`)

## Project structure

```
server.js                     # main Express app and route definitions
db.js                         # Postgres connection
routes/                       # additional route modules (main, premium)
middlewares/                  # auth, premium access, rate limiting
services/                     # Stripe and caching services
chat/                         # AI chat + vocab chat routes
views/                        # EJS templates
public/                       # static assets
migrations/                   # SQL migrations (see migrations/README.md)
snowwords-chrome-extension/   # Chrome extension source
```

## Getting started

### Prerequisites

- Node.js and npm
- A PostgreSQL database (e.g. a free [Supabase](https://supabase.com) project)

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/tonyliu65242/snowwords.git
   cd snowwords
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `SESSION_SECRET` | Random secret for session encryption (`openssl rand -base64 32`) |
   | `NODE_ENV` | `development` or `production` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
   | `GOOGLE_CALLBACK_URL` | OAuth callback URL, e.g. `http://localhost:3000/auth/google/callback` |
   | `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe keys for subscriptions |
   | `GROQ_API_KEY` | API key for the AI chat feature ([console.groq.com](https://console.groq.com)) |
   | `ADMIN_PASSWORD` | Password for the `/admin` panel (optional) |
   | `PORT` | Port to run the server on (defaults to `3000`) |

3. Run any pending database migrations — see [`migrations/README.md`](migrations/README.md) for instructions.

4. Start the server:

   ```bash
   npm start
   ```

   The app runs at `http://localhost:3000` by default.

### Chrome extension

The extension in `snowwords-chrome-extension/` can be loaded unpacked from `chrome://extensions` (enable Developer mode → "Load unpacked") for local testing, or installed from the packaged `snowwords-chrome-extension.zip`. It talks to the deployed Snowwords site to authenticate and save words.

## Deployment

Deployment guides are included for reference:

- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Northflank deployment with a Supabase database
- [`NORTHFLANK-SIMPLE-GUIDE.md`](NORTHFLANK-SIMPLE-GUIDE.md) — a simplified walkthrough
- [`CLOUDFLARE-DOMAIN-SETUP.md`](CLOUDFLARE-DOMAIN-SETUP.md) — pointing a custom domain through Cloudflare

A `Dockerfile` is also included for containerized deployment.

## License

ISC
