FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY tsconfig.json .

# Build
RUN npm run build
RUN npm run prisma:generate

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json .
COPY --chown=nodejs:nodejs prisma ./prisma

# Create directories for persistent volumes
RUN mkdir -p /app/uploads /app/sessions && \
    chown -R nodejs:nodejs /app/uploads /app/sessions

# Switch to non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Start
CMD ["node", "dist/server.js"]
