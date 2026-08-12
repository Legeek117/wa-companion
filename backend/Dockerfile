# ─────────────────────────────────────────────────────────────
# Stage 1 : Build
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les manifestes de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier les sources
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json .
COPY tsconfig.scripts.json .

# Compiler TypeScript (src + scripts) + générer le client Prisma
RUN npm run build
RUN npm run build:scripts
RUN npm run prisma:generate

# ─────────────────────────────────────────────────────────────
# Stage 2 : Runtime
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine

# Installer OpenSSL 3 (requis par Prisma)
RUN apk add --no-cache openssl

WORKDIR /app

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copier les artefacts du build
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json .

# Copier les scripts de seed et d'init
COPY --chown=nodejs:nodejs scripts ./scripts

# Créer les répertoires de données persistantes
RUN mkdir -p /app/uploads/deleted-messages /app/uploads/view-once /app/sessions && \
    chown -R nodejs:nodejs /app/uploads /app/sessions

# Copier et rendre exécutable le script de démarrage
COPY --chown=nodejs:nodejs docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Passer à l'utilisateur non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
