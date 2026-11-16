# ---------------------------------------------------------
# ETAPA 1: Construção e Instalação (Ambiente Temporário)
# ---------------------------------------------------------
# node:24 é a versão LTS (node:25 não tem suporte de longo prazo).
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# O @mermaid-js/mermaid-cli (devDependency, só para diagramas da documentação) baixaria o
# Chromium a cada build; o backend não usa. Deixa o build mais rápido e menor.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copia os arquivos de dependência e a pasta do Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma-logs ./prisma-logs/
COPY prisma.config.ts ./prisma.config.ts
COPY prisma.logs.config.ts ./prisma.logs.config.ts
# Instala TUDO para poder rodar ferramentas de desenvolvimento (como TypeScript e Prisma CLI)
RUN npm install

# Copia o código-fonte (o seu .dockerignore vai filtrar o que não precisa)
COPY src ./src
COPY config ./config
COPY tsconfig.json ./
COPY middleware ./middleware

# Compila o TypeScript: os .js são gerados aqui (não ficam mais versionados no git)
RUN npm run build

# Executa a geração do cliente do Prisma de forma otimizada
RUN LOGS_DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma generate --config=prisma.logs.config.ts
RUN DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma generate --config=prisma.config.ts
# Remove as ferramentas de desenvolvimento e reinstala APENAS os pacotes de produção
RUN rm -rf node_modules && \
    npm install --omit=dev && \
    LOGS_DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma generate --config=prisma.logs.config.ts && \
    DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma generate --config=prisma.config.ts
# ---------------------------------------------------------
# ETAPA 2: Imagem Final de Produção (Ultra-Leve)
# ---------------------------------------------------------
FROM node:24-alpine

# libc6-compat: exigida pelo Prisma no Alpine. su-exec: troca do root para o usuário "node" na entrada.
RUN apk add --no-cache libc6-compat su-exec
WORKDIR /app

# Copia APENAS o essencial da Etapa 1, deixando para trás todo o lixo de dev
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma-logs ./prisma-logs/
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/prisma.logs.config.ts ./prisma.logs.config.ts
COPY --from=builder /app/config ./config
COPY --from=builder /app/middleware ./middleware
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Pastas gravadas pelo backend (áudios, fila de auditoria, licença, exportação de RTF).
RUN mkdir -p /app/public/audios /app/data/audit-outbox /app/data/license /app/export/modelos-rtf \
    && chown -R node:node /app/public /app/data /app/export \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 5000

# A entrada roda como root só para ajustar o dono dos volumes (que podem ter sido criados como root
# em versões anteriores) e depois executa o servidor como o usuário "node", sem privilégios.
ENTRYPOINT ["docker-entrypoint.sh"]
# node direto (sem npm) recebe o SIGTERM do Docker e encerra limpo.
CMD ["node", "src/server.js"]
