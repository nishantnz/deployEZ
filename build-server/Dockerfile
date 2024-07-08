FROM ubuntu:focal

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl git && \
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get upgrade -y && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /home/app

# Copy application dependency manifests
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy Prisma schema file from API server folder
COPY .env ./
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy remaining application files
COPY main.sh script.js ./

# Ensure scripts have execution permissions
RUN chmod +x main.sh script.js

# Set entrypoint
ENTRYPOINT [ "/home/app/main.sh" ]
