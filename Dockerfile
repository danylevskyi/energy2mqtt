FROM node:19-alpine
WORKDIR /energy2mqtt
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
