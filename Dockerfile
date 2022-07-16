FROM node:16-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN yarn --frozen-lockfile
COPY . .
EXPOSE 3000
CMD npm start