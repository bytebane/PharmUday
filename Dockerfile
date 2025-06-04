# ---- Base Stage ----
# Common setup for both development and production builds
FROM node:24-slim AS common_base

# Install OpenSSL and other required packages
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
# Set the working directory to the application root
WORKDIR /app

# Install dependencies
# (Copy these first to leverage Docker cache for dependencies)
COPY package.json ./
# Install only production dependencies
RUN npm install

# Copy prisma schema and generate client
# Adjust the path if your prisma schema is not in ./prisma
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code.
# This is done in the base stage so builder can access all source files.
COPY . .

# ---- Development Stage ----
# Used for local development with hot-reloading
FROM common_base AS development
ENV NODE_ENV=development

# Your Next.js application likely runs on port 3000
EXPOSE 3000

# The command to start your Next.js development server
# Ensure your 'dev' script in package.json starts Next.js (e.g., "next dev")
CMD ["npm", "run", "dev"]

# ---- Builder Stage ----
# Builds the Next.js application for production
FROM common_base AS builder
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=2048

# This will use the `output: 'standalone'` from next.config.js
RUN npm run build

# ---- Production Stage ----
# Creates a lean image for running the production application
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production

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
