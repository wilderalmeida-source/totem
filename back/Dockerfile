# 1. ESTÁGIO DE DEPENDÊNCIAS
FROM node:25-alpine AS deps
WORKDIR /app

# Copia apenas os arquivos de dependências
COPY package.json package-lock.json* ./
# Instala todas as dependências (incluindo devDependencies para o build)
RUN npm install

# 2. ESTÁGIO DE BUILD (Opcional se você usa TypeScript, se for JS puro pode pular)
FROM node:25-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Se você usa TypeScript, descomente a linha abaixo:
RUN npm run build

# 3. ESTÁGIO DE EXECUÇÃO
FROM node:25-alpine AS runner
WORKDIR /app

# Define para ambiente de produção
ENV NODE_ENV=production

# Cria um usuário para segurança (evitar rodar como root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 node-app

# Copia apenas o necessário do estágio de dependências (somente prod)
COPY --from=deps /app/package.json ./package.json
# Reinstala apenas as dependências de produção para economizar espaço
RUN npm install --omit=dev

# Copia o código-fonte (ou a pasta dist se você fez build de TS)
COPY . .

# Garante a permissão correta para o usuário node-app
RUN chown -R node-app:nodejs /app
USER node-app

# Porta onde seu servidor Node costuma rodar (ex: 5000)
EXPOSE 5000

# Comando para iniciar sua API
CMD ["node", "src/server.js"]