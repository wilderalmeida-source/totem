FROM node:25-alpine
WORKDIR /app

# Instala ferramentas nativas caso alguma biblioteca de banco precise compilar algo
RUN apk add --no-cache libc6-compat

# Copia os arquivos de dependência e a pasta do Prisma
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala TUDO (incluindo tsx, typescript e devDependencies)
RUN npm install

# Copia o restante do código-fonte local
COPY . .

# Expõe a porta da sua API
EXPOSE 5000

# O comando padrão aqui vira o de dev (mas ele será gerenciado pelo Compose)
CMD ["npm", "run", "dev"]