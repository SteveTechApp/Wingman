# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

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

# Copy custom nginx configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend service
    location /api/ {
        proxy_pass http://backend:8787/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
