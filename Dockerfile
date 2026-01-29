# Build stage
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npm ci

COPY . .
RUN npm run build

# Run stage
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Cloud Run listens on 8080
ENV PORT=8080

# Only copy what we need
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["npm", "start", "--", "-p", "8080"]