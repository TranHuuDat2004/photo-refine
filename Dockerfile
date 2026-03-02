FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy root package.json and server package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (runs postinstall script in root package.json)
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
