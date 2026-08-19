# Portable container build for Small Claims Genie.
#
# This packages the application and its system PDF/audio tooling. It does not
# replace external services such as Clerk, Stripe, OpenAI, Resend, Tyler EFM, or
# the current Replit object-storage sidecar. Configure those values in .env and
# follow PORTABILITY.md before treating this as a production deployment.

FROM node:24-bookworm AS build

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@10.26.1 --activate

COPY . .

RUN pnpm install --frozen-lockfile

# The Vite build embeds the Clerk publishable key. Supplying it as a build
# argument keeps the Dockerfile reusable; never hard-code a real key here.
ARG VITE_CLERK_PUBLISHABLE_KEY=replace_at_build_time
ARG VITE_CLERK_PUBLISHABLE_KEY_DEV=replace_at_build_time
ENV NODE_ENV=production \
    VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY} \
    VITE_CLERK_PUBLISHABLE_KEY_DEV=${VITE_CLERK_PUBLISHABLE_KEY_DEV}

RUN find . -name '*.tsbuildinfo' -delete \
  && pnpm run typecheck:libs \
  && pnpm --filter @workspace/api-server run build \
  && pnpm --filter @workspace/small-claims-genie run build

FROM node:24-bookworm AS api

WORKDIR /app

# Runtime requirements for PDF generation, text extraction, browser-based PDF
# generation, and audio conversion.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    pdftk-java \
    poppler-utils \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@10.26.1 --activate

COPY --from=build /app /app

ENV NODE_ENV=production \
    PORT=8080 \
    CHROMIUM_PATH=/usr/bin/chromium

EXPOSE 8080

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/small-claims-genie/dist/public /usr/share/nginx/html

EXPOSE 80