FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY . .
ARG PUBLIC_UMAMI_WEBSITE_ID=
ARG PUBLIC_ANALYTICS_PROXY_PATH=
ENV PUBLIC_UMAMI_WEBSITE_ID=$PUBLIC_UMAMI_WEBSITE_ID
ENV PUBLIC_ANALYTICS_PROXY_PATH=$PUBLIC_ANALYTICS_PROXY_PATH
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY server.mjs ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
