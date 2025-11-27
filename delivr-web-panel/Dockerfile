# Use Node.js 18.18.0 (as specified in package.json engines)
FROM node:18.18.0-alpine

# Set working directory
WORKDIR /app

# Install and enable corepack (required for proper pnpm version management)
RUN corepack enable

# Install pnpm globally (will use version from package.json packageManager field)
RUN corepack prepare pnpm@10.17.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (skip scripts since routes-gen needs source files)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy application files
COPY . .

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run postinstall script to generate routes (now that source files are available)
RUN pnpm run gen:routes

# Build the application for production
RUN pnpm build

# Expose port 3000
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Set entrypoint to handle localhost -> host.docker.internal conversion
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the production server
CMD ["pnpm", "start"]

