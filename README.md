# Nagarik App

Simple Nepal citizen identity demo with:
- Citizen registration UI
- Face verification API
- Admin dashboard for API key management

## Use Case

- A citizen registers identity data + face descriptors.
- A third-party app (example: voting app) verifies identity using Nagarik API.
- Admin can create/revoke API keys to control third-party access.

## Run (Quick)

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL

### 1) Install
```bash
pnpm install --ignore-scripts
```

### 2) Configure backend env
Create `backend/.env` with required values (database URL, JWT secret, encryption/hash keys).

### 3) Prepare database
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4) Start all apps
```bash
pnpm dev
```

Runs on:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Admin: http://localhost:5174

## Run individually

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:admin
```

## Default Admin Login

- Username: `admin`
- Password: `Admin@123`
