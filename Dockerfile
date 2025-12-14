# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port (Northflank will set PORT env var)
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
