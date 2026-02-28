FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy app sources.
COPY . .

EXPOSE 4321

# Run Astro dev server on all interfaces for Docker usage.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]
