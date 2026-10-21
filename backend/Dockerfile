# Production Dockerfile for Node.js Backend API
FROM node:20-alpine

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
