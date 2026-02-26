# Nagarik App Mock Platform

A full-stack citizen identity registration and verification system for Nepal. This platform captures face data (3 angles) along with citizen information, stores face descriptors for identity verification, and exposes APIs for third-party platforms (like voting systems) to verify citizen identity and liveness.

## Features

- **Citizen Registration**: Register citizens with personal information and 3-angle face capture
- **Face Recognition**: Browser-based face detection using face-api.js
- **Identity Verification**: API endpoints for third-party identity verification
- **Liveness Detection**: Verify live person presence through face matching
- **Duplicate Detection**: Prevent duplicate registrations through face matching
- **Admin Dashboard**: Manage citizens, view statistics, and manage API keys
- **API Key Management**: Secure third-party access through API keys

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication for admin
- AES-256-GCM encryption for PII
- Zod for validation

### Frontend
- React.js + TypeScript + Vite
- Tailwind CSS
- face-api.js for face detection

### Admin Dashboard
- React.js + TypeScript + Vite
- Tailwind CSS

## Project Structure

```
nagarikMock/
├── packages/
│   └── types/           # Shared TypeScript types
├── apps/
│   ├── frontend/        # Citizen registration app (port 5173)
│   └── admin/           # Admin dashboard (port 5174)
├── backend/             # Express API server (port 3001)
├── docker-compose.yml   # Docker orchestration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nagarikMock
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with your database credentials
   ```

4. **Set up the database**
   ```bash
   cd backend
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   pnpm dev

   # Terminal 2: Frontend
   cd apps/frontend
   pnpm dev

   # Terminal 3: Admin
   cd apps/admin
   pnpm dev
   ```

6. **Access the applications**
   - Frontend: http://localhost:5173
   - Admin: http://localhost:5174
   - API: http://localhost:3001

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

### Public Endpoints

#### Health Check
```
GET /health
```

#### Register Citizen
```
POST /api/register
Content-Type: application/json

{
  "fullName": "Ram Bahadur Shrestha",
  "citizenshipNumber": "01-01-76-12345",
  "dateOfBirth": "1990-01-15",
  "gender": "Male",
  "district": "Kathmandu",
  "municipality": "Kathmandu Metropolitan",
  "wardNumber": 10,
  "phoneNumber": "9841234567",
  "faceDescriptors": {
    "front": [...128 numbers...],
    "left": [...128 numbers...],
    "right": [...128 numbers...]
  }
}
```

### Protected Endpoints (Require API Key)

Include API key in header: `X-API-Key: your-api-key`

#### Verify Identity
```
POST /api/verify/identity
Content-Type: application/json
X-API-Key: your-api-key

{
  "citizenId": "ctz_xxxxx",
  "faceDescriptor": [...128 numbers...]
}
```

#### Liveness and Identity Verification
```
POST /api/verify/liveness-and-identity
Content-Type: application/json
X-API-Key: your-api-key

{
  "citizenId": "ctz_xxxxx",
  "faceDescriptors": {
    "front": [...128 numbers...],
    "left": [...128 numbers...],
    "right": [...128 numbers...]
  }
}
```

#### Check Duplicate Face
```
POST /api/verify/check-duplicate-face
Content-Type: application/json
X-API-Key: your-api-key

{
  "faceDescriptor": [...128 numbers...]
}
```

### Admin Endpoints (Require JWT)

Include JWT in header: `Authorization: Bearer <token>`

#### Admin Login
```
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Get Dashboard Stats
```
GET /api/admin/stats
Authorization: Bearer <token>
```

#### List Citizens
```
GET /api/admin/citizens?page=1&limit=20&search=ram
Authorization: Bearer <token>
```

#### Manage API Keys
```
GET /api/admin/api-keys
POST /api/admin/api-keys
DELETE /api/admin/api-keys/:id
Authorization: Bearer <token>
```

## Face Matching Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| MATCH | 0.50 | Face is considered a match |
| DUPLICATE | 0.45 | Face is considered a potential duplicate |
| HIGH_CONFIDENCE | 0.40 | High confidence match |

## Security Features

- **Encryption**: All PII is encrypted using AES-256-GCM
- **Hashing**: SHA-256 hashing for lookups (citizenship, phone)
- **Rate Limiting**: API endpoints are rate-limited
- **CORS**: Configurable CORS settings
- **Helmet.js**: Security headers

## Default Credentials

**Admin Dashboard:**
- Username: `admin`
- Password: `admin123`

**Note:** Change these in production!

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nagarik_db
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=32-character-encryption-key!!
PORT=3001
NODE_ENV=development
```

## License

This is a demonstration/mock platform for educational purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
# nagarikAppMock
