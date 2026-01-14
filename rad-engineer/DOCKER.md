# Docker Deployment Guide

This guide covers deploying rad-engineer using Docker and OrbStack.

## Prerequisites

- [OrbStack](https://orbstack.dev/) or Docker Desktop installed
- Bun installed locally (for testing)
- Anthropic API key

## Quick Start

### 1. Configure Environment

```bash
# Copy the environment template
cp .env.docker.template .env.docker

# Edit .env.docker and add your API keys
# At minimum, set ANTHROPIC_API_KEY
nano .env.docker
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose --env-file .env.docker up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f rad-engineer
```

### 3. Access Services

- **Rad Engineer App**: http://localhost:3000
- **Metrics Endpoint**: http://localhost:9090/metrics
- **Prometheus UI**: http://localhost:9091
- **Grafana UI**: http://localhost:3001 (admin/admin)

## Architecture

The Docker setup includes three services:

### rad-engineer
- Main application container
- Exposes ports 3000 (app) and 9090 (metrics)
- Uses Bun runtime
- Non-root user (UID 1001)
- Persistent volumes for data, logs, checkpoints, audit

### prometheus
- Metrics collection and storage
- Scrapes rad-engineer metrics every 10s
- 30-day retention
- Web UI on port 9091

### grafana
- Visualization and dashboards
- Pre-configured Prometheus datasource
- Default dashboard: "Rad Engineer - Overview"
- SQLite backend with persistent storage

## Management Commands

### Start Services
```bash
docker-compose --env-file .env.docker up -d
```

### Stop Services
```bash
docker-compose down
```

### Restart Specific Service
```bash
docker-compose restart rad-engineer
docker-compose restart prometheus
docker-compose restart grafana
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f rad-engineer
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

### Execute Commands in Container
```bash
# Open shell in rad-engineer container
docker-compose exec rad-engineer sh

# Run tests in container
docker-compose exec rad-engineer bun test

# Check health
docker-compose exec rad-engineer bun run src/observability/health-check-example.ts
```

### Scale Services (if needed)
```bash
# Not applicable for this setup since services are singletons
# But you could run multiple rad-engineer instances:
docker-compose up -d --scale rad-engineer=3
```

## Volumes

Persistent data is stored in Docker volumes:

- `rad-engineer-data`: Application data
- `rad-engineer-logs`: Application logs
- `rad-engineer-checkpoints`: Execution checkpoints
- `rad-engineer-audit`: Audit logs
- `rad-engineer-prometheus-data`: Prometheus metrics
- `rad-engineer-grafana-data`: Grafana dashboards and config

### Backup Volumes
```bash
# Backup rad-engineer data
docker run --rm \
  -v rad-engineer-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/rad-engineer-data-$(date +%Y%m%d).tar.gz /data

# Backup Prometheus data
docker run --rm \
  -v rad-engineer-prometheus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/prometheus-data-$(date +%Y%m%d).tar.gz /data

# Backup Grafana data
docker run --rm \
  -v rad-engineer-grafana-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/grafana-data-$(date +%Y%m%d).tar.gz /data
```

### Restore Volumes
```bash
# Restore rad-engineer data
docker run --rm \
  -v rad-engineer-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/rad-engineer-data-YYYYMMDD.tar.gz --strip 1"
```

### Remove Volumes (⚠️ Data Loss)
```bash
docker-compose down -v
```

## Health Checks

All services have health checks configured:

```bash
# Check rad-engineer health
curl http://localhost:3000/health/ready

# Check Prometheus health
curl http://localhost:9091/-/healthy

# Check Grafana health
curl http://localhost:3001/api/health
```

## Monitoring

### View Metrics
```bash
# Prometheus metrics from rad-engineer
curl http://localhost:9090/metrics

# Query Prometheus
curl 'http://localhost:9091/api/v1/query?query=agent_tasks_total'
```

### Grafana Dashboards

1. Open http://localhost:3001
2. Login with admin/admin (change on first login)
3. Navigate to "Rad Engineer - Overview" dashboard
4. View:
   - Active agents by wave
   - Task completion rate
   - Task duration percentiles
   - CPU utilization

## Resource Limits

Default limits (configured in docker-compose.yml):

| Service      | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|--------------|-----------|--------------|-------------|----------------|
| rad-engineer | 2 cores   | 2GB          | 0.5 cores   | 512MB          |
| prometheus   | 1 core    | 1GB          | 0.25 cores  | 256MB          |
| grafana      | 1 core    | 512MB        | 0.25 cores  | 128MB          |

Adjust in `docker-compose.yml` if needed.

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs rad-engineer

# Check if ports are already in use
lsof -i :3000
lsof -i :9090
lsof -i :9091
lsof -i :3001

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Missing API Key Error

```bash
# Error: ANTHROPIC_API_KEY is required
# Solution: Check .env.docker file has ANTHROPIC_API_KEY set

# Verify environment
docker-compose config
```

### Container Crashes

```bash
# Check container status
docker-compose ps

# View last 100 lines of logs
docker-compose logs --tail=100 rad-engineer

# Check resource usage
docker stats
```

### Metrics Not Appearing

```bash
# Verify Prometheus is scraping
curl http://localhost:9091/api/v1/targets

# Check rad-engineer metrics endpoint
curl http://localhost:9090/metrics

# Restart Prometheus
docker-compose restart prometheus
```

### Permission Issues

```bash
# Containers run as non-root user (UID 1001)
# If you have permission issues with volumes:

# Fix ownership
docker-compose exec -u root rad-engineer chown -R radeng:radeng /app/data /app/logs
```

## Building

### Build Specific Stage
```bash
# Build builder stage only
docker build --target builder -t rad-engineer:builder .

# Build runtime stage
docker build --target runtime -t rad-engineer:runtime .
```

### Build with Custom Tag
```bash
docker build -t rad-engineer:v0.0.1 .
```

### Build without Cache
```bash
docker-compose build --no-cache
```

## Production Recommendations

### Security

1. **Change default Grafana credentials**:
   ```bash
   # In .env.docker
   GRAFANA_ADMIN_PASSWORD=strong-password-here
   ```

2. **Use secrets management**:
   - Store API keys in OrbStack secrets or environment
   - Don't commit .env.docker to version control

3. **Enable TLS**:
   - Add reverse proxy (nginx/traefik) with Let's Encrypt
   - Configure HTTPS for Grafana

4. **Network isolation**:
   - Use Docker networks to isolate services
   - Only expose necessary ports

### Performance

1. **Adjust resource limits** based on workload
2. **Monitor container metrics** with docker stats
3. **Configure Prometheus retention** based on needs
4. **Use SSD storage** for volumes

### Reliability

1. **Enable restart policies** (already configured as `unless-stopped`)
2. **Set up log rotation**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```
3. **Configure backup automation**
4. **Set up alerting** in Prometheus/Grafana

## OrbStack-Specific Features

### Access from macOS
```bash
# Services are automatically accessible from macOS
# No need for port forwarding

# View in OrbStack UI
orb open rad-engineer
```

### OrbStack Networking
```bash
# Containers can access macOS localhost via:
# host.docker.internal

# Example: Access Ollama running on macOS
OLLAMA_HOST=http://host.docker.internal:11434
```

### OrbStack CLI
```bash
# List containers
orb list

# Stop all containers
orb stop rad-engineer-app rad-engineer-prometheus rad-engineer-grafana

# Resource usage
orb stats
```

## Development Workflow

### Local Development with Hot Reload

For development, you might want to mount source code:

```yaml
# Add to docker-compose.yml under rad-engineer service
volumes:
  - ./src:/app/src:ro
  - rad-engineer-data:/app/data
  # ... other volumes
```

### Run Tests in Container
```bash
docker-compose exec rad-engineer bun test
docker-compose exec rad-engineer bun run typecheck
docker-compose exec rad-engineer bun run lint
```

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [OrbStack Documentation](https://docs.orbstack.dev/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
