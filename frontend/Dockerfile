FROM node:18-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install

ENV NODE_ENV=production
RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npm start -- -p ${PORT}"]

