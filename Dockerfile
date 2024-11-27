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

# Expose both ports (for Next.js and health check)
EXPOSE 3000 8000

# Set the environment variables
ENV PORT=3000
ENV HEALTH_CHECK_PORT=8000

# Start the application with health check
CMD ["sh", "-c", "node server.js & nc -l -p 8000"] 