FROM node:18-alpine

WORKDIR /app

# Install dependencies needed for sqlite3 and other build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --only=production

COPY . .

# Create ftp and data directories
RUN mkdir -p ftp data

# Expose Web, FTP Control, and FTP Passive ports
EXPOSE 3000 21 10000-10100

CMD ["node", "server.js"]
