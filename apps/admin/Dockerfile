# Admin Dashboard Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY apps/admin ./apps/admin

# Build types package
WORKDIR /app/packages/types
RUN pnpm build

# Build admin
WORKDIR /app/apps/admin
RUN pnpm build

# Production image with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
