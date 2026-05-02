FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Expose the port
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the application
CMD ["npx", "tsx", "server.ts"]
