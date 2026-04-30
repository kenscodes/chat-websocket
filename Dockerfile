# Use a lightweight, secure Node.js 20 Alpine Linux image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy only the package files first to leverage Docker's aggressive layer caching
COPY package*.json ./

# Install production dependencies (skipping dev dependencies)
RUN npm ci --only=production

# Copy the rest of the application code into the container
COPY . .

# Expose the default assigned port
EXPOSE 3000

# Set the environment flag explicitly (best practice for express/node)
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
