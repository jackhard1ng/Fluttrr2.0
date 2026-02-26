FROM node:22-alpine AS base

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code
COPY . .

# Create uploads directory for local fallback
RUN mkdir -p uploads

# Non-root user for security
RUN addgroup -g 1001 -S fluttrr && \
    adduser -S fluttrr -u 1001 -G fluttrr && \
    chown -R fluttrr:fluttrr /app
USER fluttrr

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
