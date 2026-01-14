# engg-support-system Local Development Setup Guide

> **Purpose**: Step-by-step guide to clone ESS from VPS and set up local development environment
> **Time Required**: ~30 minutes
> **Prerequisites**: OrbStack or Docker Desktop, SSH access to VPS

---

## Quick Start

```bash
# 1. Clone from VPS
cd ~/Projects
git clone devuser@72.60.204.156:/home/devuser/Projects/engg-support-system
cd engg-support-system

# 2. Start Docker services
docker-compose -f docker-compose.local.yml up -d

# 3. Verify services
./scripts/verify-local-env.sh

# 4. Install dependencies
cd gateway && bun install && cd ..
cd veracity-engine && pip install -r requirements.txt && cd ..

# 5. Run tests
bun test && pytest
```

---

## Detailed Steps

### Step 1: Clone Repository from VPS

**Option A: If VPS has git repo**
```bash
cd ~/Projects
git clone devuser@72.60.204.156:/home/devuser/Projects/engg-support-system
```

**Option B: If VPS is not a git repo**
```bash
# First, initialize git on VPS
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git init
echo "node_modules/" > .gitignore
echo "__pycache__/" >> .gitignore
echo ".env" >> .gitignore
git add -A
git commit -m "Initial commit - ESS from VPS"
EOF

# Then clone to local
cd ~/Projects
git clone devuser@72.60.204.156:/home/devuser/Projects/engg-support-system
```

**Option C: Direct copy (if git issues)**
```bash
cd ~/Projects
scp -r devuser@72.60.204.156:/home/devuser/Projects/engg-support-system .
cd engg-support-system
git init
git add -A
git commit -m "Initial commit - copied from VPS"
```

### Step 2: Configure VPS Remote

```bash
cd ~/Projects/engg-support-system

# Add VPS as remote for deployment
git remote add vps devuser@72.60.204.156:/home/devuser/Projects/engg-support-system

# Verify remotes
git remote -v
# Should show:
# vps  devuser@72.60.204.156:/home/devuser/Projects/engg-support-system (fetch)
# vps  devuser@72.60.204.156:/home/devuser/Projects/engg-support-system (push)
```

### Step 3: Create Local Docker Compose

Create `docker-compose.local.yml`:

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    container_name: ess-neo4j-local
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/password123
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j_local:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7474"]
      interval: 10s
      timeout: 5s
      retries: 5

  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: ess-qdrant-local
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_local:/qdrant/storage
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ess-redis-local
    ports:
      - "6379:6379"
    volumes:
      - redis_local:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  ollama:
    image: ollama/ollama:latest
    container_name: ess-ollama-local
    ports:
      - "11434:11434"
    volumes:
      - ollama_local:/root/.ollama

volumes:
  neo4j_local:
  qdrant_local:
  redis_local:
  ollama_local:
```

### Step 4: Start Docker Services

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be healthy
sleep 30

# Check status
docker-compose -f docker-compose.local.yml ps
```

### Step 5: Pull Ollama Model

```bash
# Pull the embedding model
docker exec ess-ollama-local ollama pull nomic-embed-text

# Verify model
docker exec ess-ollama-local ollama list
# Should show: nomic-embed-text
```

### Step 6: Create Environment File

Create `.env.local`:

```bash
# Database connections (local Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# VPS deployment target
VPS_HOST=72.60.204.156
VPS_USER=devuser
VPS_PROJECT_PATH=/home/devuser/Projects/engg-support-system
```

### Step 7: Create Verification Script

Create `scripts/verify-local-env.sh`:

```bash
#!/bin/bash
set -e

echo "=== ESS Local Environment Verification ==="
echo ""

# Check Neo4j
echo -n "Checking Neo4j... "
if curl -s -f http://localhost:7474 > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED (port 7474)"
fi

# Check Qdrant
echo -n "Checking Qdrant... "
if curl -s -f http://localhost:6333/health > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED (port 6333)"
fi

# Check Redis
echo -n "Checking Redis... "
if redis-cli -h localhost ping 2>/dev/null | grep -q PONG; then
    echo "✓ OK"
else
    echo "✗ FAILED (port 6379)"
fi

# Check Ollama
echo -n "Checking Ollama... "
if curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED (port 11434)"
fi

# Check Ollama model
echo -n "Checking nomic-embed-text model... "
if docker exec ess-ollama-local ollama list 2>/dev/null | grep -q nomic-embed-text; then
    echo "✓ OK"
else
    echo "✗ NOT FOUND (run: docker exec ess-ollama-local ollama pull nomic-embed-text)"
fi

echo ""
echo "=== Verification Complete ==="
```

Make executable:
```bash
chmod +x scripts/verify-local-env.sh
./scripts/verify-local-env.sh
```

### Step 8: Install Project Dependencies

```bash
# Gateway (TypeScript)
cd gateway
bun install
cd ..

# Veracity Engine (Python)
cd veracity-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# Knowledge Base (if exists)
cd knowledge-base
bun install
cd ..
```

### Step 9: Run Tests

```bash
# Gateway tests
cd gateway && bun test && cd ..

# Veracity Engine tests
cd veracity-engine && pytest && cd ..
```

---

## Deployment to VPS

### Push Changes to VPS

```bash
# Commit local changes
git add -A
git commit -m "feat: your changes here"

# Push to VPS
git push vps main
```

### Deploy on VPS

```bash
# SSH to VPS and restart services
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git pull
docker-compose down
docker-compose up -d
sleep 10
curl -f http://localhost:3000/health
echo "Deployment complete!"
EOF
```

### One-Command Deploy

Create `scripts/deploy-to-vps.sh`:

```bash
#!/bin/bash
set -e

echo "=== Deploying to VPS ==="

# 1. Run local tests
echo "Running tests..."
cd gateway && bun test && cd ..
cd veracity-engine && pytest && cd ..

# 2. Push to VPS
echo "Pushing to VPS..."
git push vps main

# 3. Deploy on VPS
echo "Deploying on VPS..."
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git pull
docker-compose down
docker-compose up -d
sleep 10
curl -f http://localhost:3000/health || exit 1
echo "Deployment successful!"
EOF

echo "=== Deployment Complete ==="
```

---

## Troubleshooting

### Docker Containers Won't Start

```bash
# Check logs
docker-compose -f docker-compose.local.yml logs

# Restart with fresh volumes
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Neo4j Connection Refused

```bash
# Wait for Neo4j to initialize (can take 30-60 seconds)
docker logs -f ess-neo4j-local

# Check if port is bound
lsof -i :7687
```

### Ollama Model Not Found

```bash
# Pull model manually
docker exec -it ess-ollama-local ollama pull nomic-embed-text

# Verify
docker exec ess-ollama-local ollama list
```

### Redis Connection Issues

```bash
# Check Redis is running
docker exec ess-redis-local redis-cli ping

# Should return: PONG
```

### Git Push to VPS Fails

```bash
# Ensure VPS has bare repo or working directory
ssh vps-dev << 'EOF'
cd /home/devuser/Projects/engg-support-system
git config receive.denyCurrentBranch updateInstead
EOF
```

---

## Directory Structure After Setup

```
~/Projects/engg-support-system/
├── docker-compose.local.yml   # Local Docker config
├── docker-compose.yml         # VPS Docker config (existing)
├── .env.local                 # Local environment
├── .env                       # VPS environment (don't commit)
├── scripts/
│   ├── verify-local-env.sh
│   └── deploy-to-vps.sh
├── gateway/                   # TypeScript gateway
│   ├── src/
│   ├── tests/
│   └── package.json
├── veracity-engine/          # Python veracity engine
│   ├── core/
│   ├── tests/
│   └── requirements.txt
└── knowledge-base/           # TypeScript knowledge base
    ├── src/
    └── package.json
```

---

## Next Steps

After setup is complete:

1. **Index rad-engineer-v2 codebase** (requires TypeScript parser - Phase 1)
2. **Start HTTP gateway** (Phase 2)
3. **Run integration tests** with rad-engineer-v2

See `IMPLEMENTATION-PLAN.md` for detailed task breakdown.
