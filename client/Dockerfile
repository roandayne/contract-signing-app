FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

EXPOSE 5173

# Start Vite dev server with host flag
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 