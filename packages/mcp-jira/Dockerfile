# MCP Jira Server Dockerfile
#
# Multi-stage build for minimal image size.
# Uses Node.js 20 Alpine with non-root user for security.

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Prune dev dependencies
RUN pnpm prune --prod

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM node:20-alpine AS runtime

# Security: Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 -G mcpuser

WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Security: Switch to non-root user
USER mcpuser

# Environment variables (to be provided at runtime)
# JIRA_BASE_URL - Jira instance URL (required)
# JIRA_USER_EMAIL - Jira user email (required)
# JIRA_API_TOKEN - Jira API token (required)
# JIRA_TIMEOUT - Request timeout in ms (optional, default: 30000)
# JIRA_MAX_RETRIES - Max retry attempts (optional, default: 3)

# MCP servers use stdio for communication
# The server reads from stdin and writes to stdout
CMD ["node", "dist/server.js"]
