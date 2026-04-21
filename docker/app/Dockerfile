
FROM node:24-alpine
LABEL image-name=custom-shopify-dev-tools
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --production --ignore-scripts && npm cache clean --force

# Copy rest of the app
COPY . .

# Generate Prisma clients (paths match repo root)
RUN npx prisma generate --schema=prisma/schema.prisma && npx prisma generate --schema=prisma-mongo/schema.prisma

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Start Next.js app in production
CMD ["npm", "run", "start"]
