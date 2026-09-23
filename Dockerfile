# ==============================================================
# SlopeSense AI - Unified Full-Stack Production Dockerfile
# ==============================================================

# Stage 1: Build the React + Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python Backend + Production Serving
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase, models, uploads, and tests
COPY src/ ./src/
COPY models/ ./models/
COPY uploads/ ./uploads/
COPY public/ ./public/

# Copy compiled frontend from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

# Environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Start Unified FastAPI + Vite SPA server
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
