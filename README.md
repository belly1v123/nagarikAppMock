# Nagarik App Mock Platform

Nepal Citizen Identity Platform - Registration, Face Verification & Admin Dashboard

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (or use Railway/Supabase)

### 1. Install Dependencies
```bash
cd nagarikMock
pnpm install --ignore-scripts
```

### 2. Setup Database
Create `.env` file in `backend/` folder:
```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
JWT_SECRET=your_jwt_secret_at_least_32_chars
JWT_EXPIRES_IN=8h
HASH_SALT=your_hash_salt_at_least_32_chars
ENCRYPTION_KEY=your_aes_key_exactly_32_c
PROOF_SECRET=your_proof_secret_32_chars
FACE_MATCH_THRESHOLD=0.50
FACE_DUPLICATE_THRESHOLD=0.45
FACE_HIGH_CONFIDENCE_THRESHOLD=0.40
```

### 3. Generate Prisma Client & Migrate
```bash
cd backend
pnpm prisma generate
pnpm prisma migrate dev
pnpm seed
```

### 4. Build Types Package
```bash
cd packages/types
pnpm build
```

### 5. Start All Services
```bash
# From root folder
pnpm dev
```

This starts:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services |
| `pnpm dev:backend` | Start backend only |
| `pnpm dev:frontend` | Start frontend only |
| `pnpm dev:admin` | Start admin only |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database |

## Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Admin Dashboard | `admin` | `Admin@123` |
| API Key | - | `nag_live_demo_votingplatform_key_001` |

## Project Structure

```
nagarikMock/
├── packages/types/      # Shared TypeScript types
├── apps/
│   ├── frontend/        # Citizen registration (port 5173)
│   └── admin/           # Admin dashboard (port 5174)
├── backend/             # Express API (port 3001)
│   ├── prisma/          # Database schema
│   └── src/             # API source code
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register citizen |
| POST | `/api/verify/identity` | Verify identity (API key required) |
| POST | `/api/verify/liveness-and-identity` | Liveness verification |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/health` | Health check |

## Troubleshooting

### "Module not found" errors
```bash
pnpm install --ignore-scripts
cd backend && pnpm prisma generate
cd ../packages/types && pnpm build
```

### CORS errors
Add your frontend URL to `ALLOWED_ORIGINS` in `.env`

### Face detection not working
Ensure face-api.js models exist in `apps/frontend/public/models/`
