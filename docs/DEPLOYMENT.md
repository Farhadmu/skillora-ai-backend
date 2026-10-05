# Skillora AI — Production Deployment & DevOps Guide
> **Document Version**: 2.0.0 | **Deployment Targets**: Docker, Vercel, Railway, Render, AWS ECS

This document provides complete instructions for building, containerizing, deploying, and operating Skillora AI in production environments.

---

## 1. System Requirements & Architecture Topology

```
[ Internet Users ]
       │
       ▼ (HTTPS / Port 443)
[ Cloudflare / Reverse Proxy / Nginx ]
   ├──► /           ──► [ Frontend: Next.js 16 (Port 3000) ]
   └──► /api/*      ──► [ Backend: NestJS 11 (Port 3001) ]
                             │
                             ├──► [ Database: MongoDB Cluster / Atlas ]
                             ├──► [ Vector Store: Qdrant Cluster ]
                             └──► [ External AI APIs: Gemini, Groq, OpenRouter ]
```

---

## 2. Environment Variables Configuration

### 2.1 Backend (`backend/.env`)
```env
# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000,https://skillora.ai,https://app.skillora.ai

# Database (MongoDB / Atlas)
MONGODB_URI=mongodb+srv://admin:<password>@cluster0.mongodb.net/skillora?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=super_secret_production_key_minimum_32_characters_long
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super_secret_refresh_token_key_change_me_in_prod
JWT_REFRESH_EXPIRES_IN=7d

# Email Provider Configuration (resend | smtp | dev)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM="Skillora AI <verify@skillora.ai>"

# Multi-Tier AI Cascade API Keys (Provide any or all)
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
COHERE_API_KEY=...
MISTRAL_API_KEY=...
HUGGINGFACE_API_KEY=hf_...
OLLAMA_BASE_URL=http://localhost:11434

# Vector Database (Qdrant)
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=...
```

### 2.2 Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME="Skillora AI"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Production Docker Setup

Create a `docker-compose.yml` in the root workspace to orchestrate the complete stack:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: skillora_mongodb
    restart: always
    environment:
      MONGO_INITDB_DATABASE: skillora
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  qdrant:
    image: qdrant/qdrant:latest
    container_name: skillora_qdrant
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: skillora_backend
    restart: always
    environment:
      PORT: 3001
      NODE_ENV: production
      MONGODB_URI: mongodb://mongodb:27017/skillora
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
      - qdrant

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: skillora_frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mongo_data:
  qdrant_data:
```

---

## 4. Multi-Stage Dockerfiles

### 4.1 Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### 4.2 Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. Deployment Options

### 5.1 Vercel (Frontend) + Render / Railway (Backend)
1. **Frontend**: Deploy `frontend/` directly to Vercel. Set `NEXT_PUBLIC_API_URL` to your production backend URL.
2. **Backend**: Deploy `backend/` to Railway or Render as a Node.js web service with `npm run build` and `npm run start:prod`.
3. **Database**: Connect a free managed MongoDB instance via MongoDB Atlas.

### 5.2 Single-Server Deployment (Coolify / VPS)
1. Clone the repository onto your Ubuntu/Debian server.
2. Configure `.env` in `backend/` and `frontend/`.
3. Run: `docker compose up -d --build`.
4. Configure Nginx reverse proxy with Let's Encrypt SSL certificates.

---

## 6. Health Checks & Monitoring
- **Backend Health Probe**: `GET http://localhost:3001/api/health` (returns status `ok` and server uptime).
- **Interactive OpenAPI Docs**: `GET http://localhost:3001/api/docs`.
- **Frontend Health**: `GET http://localhost:3000` (returns HTTP 200 OK).
