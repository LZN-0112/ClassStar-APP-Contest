# 班务星后端生产镜像（NestJS + Prisma + MySQL）
# 构建：docker build -t banwuxing-backend:1.0.0 .
# 运行：见 docker/compose.yaml
#
# 依赖安装默认使用国内镜像源；如需官方源：
#   docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org -t banwuxing-backend:1.0.0 .

# ---------- 1. 安装全部依赖（用于编译与 prisma generate） ----------
FROM node:20-slim AS deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm config set registry ${NPM_REGISTRY} && npm ci

# ---------- 2. 编译 TypeScript ----------
FROM deps AS build
WORKDIR /app
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate \
    && npm run build

# ---------- 3. 仅生产依赖 ----------
FROM node:20-slim AS prod-deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package.json package-lock.json ./
RUN npm config set registry ${NPM_REGISTRY} && npm ci --omit=dev

# ---------- 4. 运行镜像 ----------
FROM node:20-slim AS runner
ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    PORT=3000 \
    API_PREFIX=api/v1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone

# 生产依赖
COPY --from=prod-deps /app/node_modules ./node_modules
# prisma CLI（容器启动时执行 migrate deploy）与已生成的 client
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
# 编译产物与迁移脚本
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Windows 上编辑的 .sh 可能带 CRLF，必须转换，否则容器内报 exec format error
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/api/v1/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]