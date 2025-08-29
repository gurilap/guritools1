FROM node:18

# Install system dependencies: ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y ffmpeg && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application code
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
