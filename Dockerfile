# ---- Build Stage ----
FROM oven/bun:1.3.11 AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --ignore-scripts

# Copy source code
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./

# Build the app (runs esbuild bundler)
RUN bun run build

# ---- Production Stage ----
FROM oven/bun:1.3.11-slim AS runner

WORKDIR /app

# Copy built output and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Copy environment file template
COPY .env.example ./.env.example

# Expose your app's port
EXPOSE 3000

# Start the app
CMD ["node", "dist/index.js"]
