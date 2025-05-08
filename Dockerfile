# ---- Base Stage ----
# Common setup for both development and production builds
# Using an official Bun image with Alpine for a smaller size
FROM oven/bun:1-alpine AS common_base
# Set the working directory in the container
WORKDIR /app

# Install dependencies
# (Copy these first to leverage Docker cache for dependencies)
COPY package.json ./
# Bun's lockfile
# Ensure you have bun.lockb in your project root
COPY bun.lock ./
# Install all dependencies including devDependencies, as Next.js build and Prisma generate might need them.
RUN bun install --frozen-lockfile

# Copy prisma schema and generate client
# Adjust the path if your prisma schema is not in ./prisma
COPY prisma ./prisma
RUN bunx prisma generate

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
CMD ["bun", "run", "dev"]

# ---- Builder Stage ----
# Builds the Next.js application for production
FROM common_base AS builder
ENV NODE_ENV=production

# If you have build-time NEXT_PUBLIC_ variables, declare them as ARGs
# and pass them during the `docker-compose build` for the prod service.
# ARG NEXT_PUBLIC_MY_VAR
# ENV NEXT_PUBLIC_MY_VAR=$NEXT_PUBLIC_MY_VAR

RUN bun run build # This will use the `output: 'standalone'` from next.config.js

# ---- Production Stage ----
# Creates a lean image for running the production application
FROM oven/bun:1-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Create a non-root user and group for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the necessary standalone artifacts from the builder stage
COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static

USER appuser
EXPOSE 3000
# Entrypoint for Next.js standalone output
CMD ["bun", "server.js"]
