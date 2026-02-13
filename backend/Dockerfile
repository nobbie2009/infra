FROM node:18-alpine

WORKDIR /app

ENV BUILD_TIMESTAMP=2026-02-12-214500

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install system dependencies (bash for scripts, postgresql-client for backups)
RUN apk add --no-cache bash postgresql-client

# Copy source code
ENV BUILD_TIMESTAMP=2026-02-12-220000
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
