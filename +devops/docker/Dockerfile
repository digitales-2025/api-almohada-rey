FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g pnpm
RUN pnpm config set store-dir /pnpm/.pnpm-store
# error en prisma con alpine
# https://github.com/prisma/prisma/issues/25817#issuecomment-2530137579
RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

FROM base AS prod

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm config set store-dir /pnpm/.pnpm-store

WORKDIR /app
COPY pnpm-lock.yaml .
COPY package.json .

RUN pnpm i --ignore-scripts

# Build binary
COPY . .
RUN pnpm prisma generate
RUN pnpm run build


FROM base

RUN apk add curl

COPY --from=prod /pnpm /pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm config set store-dir /pnpm/.pnpm-store

WORKDIR /app

COPY --from=prod /app/dist ./dist
COPY --from=prod /app/prisma ./prisma
COPY --from=prod /app/package.json .
COPY --from=prod /app/pnpm-lock.yaml .
COPY +devops/docker/docker-entrypoint.sh .

RUN pnpm i --prod
USER node

CMD ["sh", "docker-entrypoint.sh"]
