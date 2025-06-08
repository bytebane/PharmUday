# ---- Base Stage ----
# Common setup for both development and production builds
FROM node:24-slim AS common_base

# Install OpenSSL and other required packages
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory to the application root
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies with retry logic
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --prefer-offline

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npx prisma generate

# Copy the rest of the application code.
# This is done in the base stage so builder can access all source files.
COPY . .

# ---- Development Stage ----
FROM common_base AS development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Your Next.js application likely runs on port 3000
EXPOSE 3000

# The command to start your Next.js development server
# Ensure your 'dev' script in package.json starts Next.js (e.g., "next dev")
CMD ["npm", "run", "dev"]

# ---- Builder Stage ----
FROM common_base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=2048

# This will use the `output: 'standalone'` from next.config.js
RUN npm run build

# ---- Production Stage ----
# Creates a lean image for running the production application
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSL and other required packages for production
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user and group for better security
RUN addgroup appgroup && adduser --disabled-password --gecos "" --ingroup appgroup appuser

# Copy only the necessary standalone artifacts from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

# Copy the generated Prisma client and engines
COPY --from=builder --chown=appuser:appgroup /app/src/generated/prisma ./src/generated/prisma

USER appuser
EXPOSE 3000
# Entrypoint for Next.js standalone output
CMD ["node", "server.js"]
