# Use an official Node.js image
FROM node:18-slim

# Install dependencies required for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    ffmpeg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon-x11-0 \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy application files
COPY . .  

# Ensure all_cookies file is copied (if it exists)
COPY all_cookies ..

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
