FROM node:lts-alpine
WORKDIR /app
COPY api ./api
COPY pm2 ./pm2
WORKDIR /app/api
RUN npm install -g pm2
RUN npm install
EXPOSE 3010