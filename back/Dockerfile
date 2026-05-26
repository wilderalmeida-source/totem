# ---------------------------------------------------------
# ETAPA 1: Construção e Instalação (Ambiente Temporário)
# ---------------------------------------------------------
FROM node:25-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

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
COPY middleware ./middleware

# Executa o build do TypeScript (se o seu projeto tiver essa etapa)
# RUN npm run build

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
FROM node:25-alpine

# Instala a biblioteca de compatibilidade que o Prisma exige para rodar no Alpine
RUN apk add --no-cache libc6-compat
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
ENV NODE_ENV=production
EXPOSE 5000

# Executa o script de produção definido no seu package.json (geralmente node dist/main.js ou similar)
CMD ["npm", "run", "start"]