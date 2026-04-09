# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Full install (including devDependencies) so we can run `next build`.
RUN npm ci

COPY . .
RUN npm run build

# Production-deps stage — produces a clean node_modules with only the
# runtime dependencies. This avoids shipping eslint, typescript, @types/*,
# and the rest of the build-time tree to the runtime image.
FROM node:20-slim AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm ci --omit=dev

# Run stage — minimal, runs as the unprivileged `node` user that the
# upstream node:20-slim image already provides (uid 1000).
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Bring in only runtime artifacts.
COPY --from=builder   /app/package*.json     ./
COPY --from=prod-deps /app/node_modules      ./node_modules
COPY --from=builder   /app/.next             ./.next
COPY --from=builder   /app/public            ./public
COPY --from=builder   /app/prisma            ./prisma
COPY --from=builder   /app/scripts           ./scripts
COPY --from=builder   /app/prisma.config.ts  ./

# Drop privileges. The `node` user exists in the upstream image.
RUN chown -R node:node /app
USER node

EXPOSE 8080
CMD ["npm", "start", "--", "-p", "8080"]
