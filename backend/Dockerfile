# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY backend/package.json ./backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY backend ./backend

# Build types package
WORKDIR /app/packages/types
RUN pnpm build

# Generate Prisma client and build backend
WORKDIR /app/backend
RUN pnpm prisma generate
RUN pnpm build

# Production image
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built files
COPY --from=base /app/backend/dist ./dist
COPY --from=base /app/backend/node_modules ./node_modules
COPY --from=base /app/backend/prisma ./prisma
COPY --from=base /app/backend/package.json ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
