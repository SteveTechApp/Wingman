# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY tools/setup-git-hooks.mjs ./tools/setup-git-hooks.mjs

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Frontend capabilities are compiled by Vite, so production values must be
# supplied while the image is built rather than only at container runtime.
ARG VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=true
ARG VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP=false
ARG VITE_APP_VERSION=
ARG VITE_APP_COMMIT=
ENV VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC=$VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC
ENV VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP=$VITE_WINGMAN_ENABLE_GURU_EXTERNAL_LOOKUP
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_COMMIT=$VITE_APP_COMMIT

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# The official nginx entrypoint renders files in /etc/nginx/templates.
# Restrict substitution to these two variables so nginx's own $host/$uri
# variables remain untouched.
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=8787
ENV NGINX_ENVSUBST_FILTER="^(BACKEND_HOST|BACKEND_PORT)$"
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
