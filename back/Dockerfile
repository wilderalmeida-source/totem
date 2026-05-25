# ---------------------------------------------------------
# ETAPA 1: Construção e Instalação (Ambiente Temporário)
# ---------------------------------------------------------
FROM node:25-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia os arquivos de dependência e a pasta do Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala TUDO para poder rodar ferramentas de desenvolvimento (como TypeScript e Prisma CLI)
RUN npm install

# Copia o código-fonte (o seu .dockerignore vai filtrar o que não precisa)
COPY . .

# Executa o build do TypeScript (se o seu projeto tiver essa etapa)
# RUN npm run build

# Executa a geração do cliente do Prisma de forma otimizada
RUN npx prisma generate

# Remove as ferramentas de desenvolvimento e reinstala APENAS os pacotes de produção
RUN rm -rf node_modules && npm ci --only=production && npx prisma generate


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
COPY --from=builder /app .

ENV NODE_ENV=production
EXPOSE 5000

# Executa o script de produção definido no seu package.json (geralmente node dist/main.js ou similar)
CMD ["npm", "run", "start"]