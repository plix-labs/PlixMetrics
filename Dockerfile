# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci

# Copy frontend source and build
COPY . .
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
RUN npm ci

# Copy server source
COPY server/ ./
RUN npm run build

# Production image
FROM node:20-alpine AS production
RUN apk add --no-cache git
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy built backend
COPY --from=backend-build /app/server/dist ./server/dist

# Copy built frontend
COPY --from=frontend-build /app/dist ./dist

# Copy package.json for version info
COPY package.json ./

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=8282

# Expose port
EXPOSE 8282

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8282/api/health || exit 1

# Run the application
WORKDIR /app/server
CMD ["node", "dist/index.js"]
