# Stage 1: compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: production image (no devDependencies, no source)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Migrations are read at runtime from process.cwd()/migrations
COPY migrations ./migrations
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
