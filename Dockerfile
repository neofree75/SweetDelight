# SweetDelight – produkčný build a beh v Dockeri

# Fáza 1: build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Fáza 2: beh (len node, dist, produkčné závislosti)
FROM node:20-alpine AS run
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Produkčné závislosti (express, session, …)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Výstup buildu: dist/index.js a dist/public/
COPY --from=build /app/dist ./dist

EXPOSE 5001

CMD ["node", "dist/index.js"]
