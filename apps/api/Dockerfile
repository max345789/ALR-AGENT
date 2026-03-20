FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM deps AS build
COPY . .
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autonomous_leads?schema=public npm run prisma:generate --workspace @alr/api && npm run build --workspace @alr/shared && npm run build --workspace @alr/api

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:migrate:deploy --workspace @alr/api && npm run start --workspace @alr/api"]
