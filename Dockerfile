FROM node:16-alpine

# 서버 시간을 아시아 서울로 설정
ENV TZ=Asia/Seoul

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm install pm2 -g

COPY . .

EXPOSE 3001
EXPOSE 9615
CMD ["pm2-runtime", "ecosystem.config.js"]
