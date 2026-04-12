# 1. ESTÁGIO DE DEPENDÊNCIAS
FROM node:25-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine 
# para entender por que libc6-compat pode ser necessário.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia os arquivos de pacotes para instalar as dependências
COPY package.json package-lock.json* ./
RUN npm ci

# 2. ESTÁGIO DE BUILD
FROM node:25-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente de build (ex: URL da API) devem ser passadas aqui
# O Next.js "estampa" as variáveis NEXT_PUBLIC_ no JS durante o build
ENV NEXT_TELEMETRY_DISABLED=1
ARG LINK_API_INTERNA
ENV LINK_API_INTERNA=$LINK_API_INTERNA

RUN npm run build

# 3. ESTÁGIO DE EXECUÇÃO (RUNNER)
FROM node:25-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria um usuário do sistema para não rodar o container como root (segurança)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# O segredo do 'standalone': ele copia apenas o necessário para rodar
# Setamos as permissões para o usuário que criamos
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# Permite que o host seja '0.0.0.0' para o Docker conseguir acessar
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]