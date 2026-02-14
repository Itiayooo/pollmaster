# PollMaster 🗳️

> **Global Multi-Tenant Voting & Polling Infrastructure**

PollMaster is a production-grade, API-first polling and voting platform designed as infrastructure — not a single-use election tool. It supports multiple independent poll hosts, concurrent polls, configurable access control, flexible eligibility rules, and controlled result visibility.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (Bearer tokens) |
| State | TanStack Query (React Query) |
| Charts | Recharts |
| Email | Nodemailer (SMTP) |

---

## Architecture Overview

```
pollmaster/
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose schemas
│   │   │   ├── User.model.js
│   │   │   ├── Poll.model.js
│   │   │   └── Vote.model.js
│   │   ├── controllers/     # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── poll.controller.js
│   │   │   ├── vote.controller.js
│   │   │   ├── analytics.controller.js
│   │   │   └── invite.controller.js
│   │   ├── routes/          # Express routers
│   │   ├── middleware/       # Auth, error handling
│   │   └── server.js        # Entry point
│
└── frontend/
    └── src/
        ├── pages/           # Route components
        ├── components/      # Shared UI components
        ├── contexts/        # Auth context
        ├── services/        # API layer (axios)
        ├── types/           # TypeScript interfaces
        └── main.tsx         # Entry point
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Frontend
cd frontend
npm install
```

### 2. Seed Database (optional)

```bash
cd backend
npm run seed
```

This creates a demo user (`demo@pollmaster.io` / `demo1234`) with sample polls.

### 3. Run

```bash
# Terminal 1 - Backend
cd backend
npm run dev    # Runs on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev    # Runs on http://localhost:5173
```

---

## Core Concepts

### Poll Lifecycle
```
draft → scheduled → active → paused → closed → archived
```

### Access Models

| Type | Description | How it works |
|---|---|---|
| `public` | Open to everyone | Anyone with the URL can vote |
| `code` | Shared access code | Voters enter a code to access the poll |
| `token` | Unique per-voter token | Each voter gets a one-use token |
| `invite` | Email-based invites | Host provides emails; system sends tokenized invites |
| `account` | Requires PollMaster account | Voters must be logged in |
| `link` | Tokenized URL | Secure URL with embedded token |

### Result Visibility Modes

| Mode | Description |
|---|---|
| `real_time` | Results shown immediately to all voters |
| `on_close` | Results shown when poll status = closed |
| `host_release` | Host manually releases results |
| `hidden` | Results never shown to voters |
| `delayed` | Results shown after X minutes/hours |

### Question Types

- `single_choice` — Radio-style, one answer
- `multiple_choice` — Checkbox-style, multiple answers
- `yes_no` — Binary Yes/No question
- `rating` — Star rating (1–N scale)
- `open_text` — Free-form text response
- `ranked_choice` — Drag-to-rank (data model ready, UI extensible)

---

## API Reference

### Auth
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Polls
```
GET    /api/polls              → Host's polls (auth required)
GET    /api/polls/public       → Public polls feed
GET    /api/polls/:identifier  → Single poll by slug or shortId
POST   /api/polls              → Create poll (auth)
PATCH  /api/polls/:pollId      → Update poll (host only)
DELETE /api/polls/:pollId      → Delete poll (host only)
POST   /api/polls/:pollId/publish
POST   /api/polls/:pollId/close
POST   /api/polls/:pollId/release-results
GET    /api/polls/:pollId/tokens        → Token list (host)
POST   /api/polls/:pollId/generate-tokens
```

### Votes
```
POST /api/votes                         → Submit vote
GET  /api/votes/poll/:pollId/results   → Get results
GET  /api/votes/check/:pollSlug        → Check if voted
GET  /api/votes/poll/:pollId/export    → Export (host)
```

### Analytics
```
GET /api/analytics/dashboard       → Host dashboard stats
GET /api/analytics/poll/:pollId    → Poll-level analytics
```

### Invites
```
GET  /api/invites/:pollId          → Invite list
POST /api/invites/:pollId/send     → Send email invites
POST /api/invites/:pollId/add      → Add invitees
```

---

## Environment Variables

```env
# Backend (.env)
PORT=5000
MONGO_URI=mongodb://localhost:27017/pollmaster
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Email (for invite polls)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

FRONTEND_URL=http://localhost:5173
```

---

## Security Model

- **Password Hashing**: bcrypt (12 salt rounds)
- **JWT Authentication**: Stateless, 7-day expiry
- **Rate Limiting**: Global (500/15min), Vote endpoint (10/min)
- **IP Hashing**: SHA-256 hashed for deduplication (raw IP never stored)
- **Helmet.js**: HTTP security headers
- **CORS**: Configured to frontend origin only
- **Vote Deduplication**: By userId, token, or hashed IP depending on access type

---

## Deduplication Strategy

Votes are deduplicated based on the access model:

| Access Type | Dedup Strategy |
|---|---|
| `account` | By `userId` |
| `token` | By access token (marked used after vote) |
| `invite` | By invite token (marked voted after vote) |
| `public` | By hashed IP (if `ipDeduplication: true`) |
| `code` | By hashed IP + sessionId |

---

## Extending PollMaster

### Adding a New Question Type
1. Add the type to `Poll.model.js` question type enum
2. Add handling in `vote.controller.js` `validateAnswers()`
3. Add UI rendering in `VotePage.tsx`
4. Add results display in `ResultsPage.tsx`

### Adding a New Access Model
1. Add to `Poll.model.js` eligibility type enum
2. Add validation logic in `vote.controller.js` `validateEligibility()`
3. Add access gate in `poll.controller.js` `validateAccess()`
4. Add UI configuration in `CreatePollPage.tsx`

### Multi-Organization Support (Future)
The schema is designed to support an organization layer:
- Add `Organization` model with members
- Add `orgId` to Poll schema
- Add org-level eligibility rules
- Organizations inherit poll management without code changes

---

## Design Decisions

1. **Poll is infrastructure** — No hardcoded categories or user types. Everything is configurable.
2. **Rule-based eligibility** — Hosts define access rules, not user lists.
3. **Denormalized stats** — `poll.stats.totalVotes` is incremented atomically for fast reads without aggregation.
4. **Option vote counts embedded** — Stored on the Poll document for O(1) result reads.
5. **Vote documents separate** — For audit trail, export, and future analytics.
6. **Slug + ShortID** — Slugs are human-readable; 8-char ShortIDs for QR codes and sharing.
7. **Privacy-first dedup** — Raw IPs are never stored; SHA-256 hashed with a secret salt.
