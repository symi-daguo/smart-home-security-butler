FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY src/ ./src/
COPY public/ ./public/
COPY tsconfig.json ./
RUN npx tsc --project tsconfig.json

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
ENV NODE_OPTIONS="--max-old-space-size=128"

RUN apk add --no-cache tzdata wget && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    npm cache clean --force 2>/dev/null || true

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY package.json ./

RUN mkdir -p /app/data && \
    find ./node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find ./node_modules -name "*.md" -delete 2>/dev/null || true

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--max-old-space-size=128", "dist/server.js"]
