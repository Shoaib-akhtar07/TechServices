# Production image: Next.js + LibreOffice (Office → PDF) + fonts for OCR/rendering.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    SOFFICE_PATH=/usr/bin/soffice \
    DATABASE_URL=file:/data/softservices.db \
    PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl libreoffice-writer libreoffice-calc libreoffice-impress \
      fonts-dejavu fonts-liberation fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
# SQLite database lives on a mounted volume so it survives redeploys.
VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
