# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the Next.js application
RUN npm run build

# Copy standalone output and static files
RUN cp -r .next/standalone/* ./
RUN cp -r .next/static .next/standalone/.next/
RUN cp -r public .next/standalone/

# Expose the port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"] 