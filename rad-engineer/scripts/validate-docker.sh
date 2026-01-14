#!/usr/bin/env bash
# Validation script for Docker configuration

set -e

echo "==================================="
echo "Docker Configuration Validation"
echo "==================================="
echo ""

# Check if files exist
echo "✓ Checking required files..."
required_files=(
    "Dockerfile"
    ".dockerignore"
    "docker-compose.yml"
    "prometheus.yml"
    ".env.docker.template"
    "grafana/provisioning/datasources/prometheus.yml"
    "grafana/provisioning/dashboards/default.yml"
    "grafana/dashboards/rad-engineer-overview.json"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "  ✗ Missing: $file"
        missing_files+=("$file")
    else
        echo "  ✓ Found: $file"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo ""
    echo "ERROR: Missing required files"
    exit 1
fi

echo ""
echo "✓ All required files present"
echo ""

# Validate Dockerfile
echo "✓ Validating Dockerfile..."
if ! grep -q "FROM oven/bun:1.1.38-alpine AS builder" Dockerfile; then
    echo "  ✗ Builder stage not found"
    exit 1
fi

if ! grep -q "FROM oven/bun:1.1.38-alpine AS runtime" Dockerfile; then
    echo "  ✗ Runtime stage not found"
    exit 1
fi

if ! grep -q "HEALTHCHECK" Dockerfile; then
    echo "  ✗ Healthcheck not configured"
    exit 1
fi

echo "  ✓ Dockerfile structure valid"
echo ""

# Validate docker-compose.yml
echo "✓ Validating docker-compose.yml..."
if ! grep -q "services:" docker-compose.yml; then
    echo "  ✗ No services defined"
    exit 1
fi

required_services=("rad-engineer" "prometheus" "grafana")
for service in "${required_services[@]}"; do
    if ! grep -q "$service:" docker-compose.yml; then
        echo "  ✗ Missing service: $service"
        exit 1
    fi
    echo "  ✓ Service found: $service"
done

echo ""

# Check for health checks
echo "✓ Validating health checks..."
if ! grep -q "healthcheck:" docker-compose.yml; then
    echo "  ✗ No health checks defined"
    exit 1
fi
echo "  ✓ Health checks configured"
echo ""

# Validate prometheus.yml
echo "✓ Validating prometheus.yml..."
if ! grep -q "scrape_configs:" prometheus.yml; then
    echo "  ✗ No scrape configs"
    exit 1
fi

if ! grep -q "job_name: 'rad-engineer'" prometheus.yml; then
    echo "  ✗ Missing rad-engineer scrape job"
    exit 1
fi
echo "  ✓ Prometheus configuration valid"
echo ""

# Validate Grafana provisioning
echo "✓ Validating Grafana provisioning..."
if ! grep -q "datasources:" grafana/provisioning/datasources/prometheus.yml; then
    echo "  ✗ No datasources configured"
    exit 1
fi

if ! grep -q "providers:" grafana/provisioning/dashboards/default.yml; then
    echo "  ✗ No dashboard providers configured"
    exit 1
fi
echo "  ✓ Grafana provisioning valid"
echo ""

# Check for .env.docker
if [ ! -f ".env.docker" ]; then
    echo "⚠ Warning: .env.docker not found"
    echo "  Create it from .env.docker.template and add your API keys"
    echo "  cp .env.docker.template .env.docker"
    echo ""
fi

# Summary
echo "==================================="
echo "✓ Validation Complete"
echo "==================================="
echo ""
echo "Next steps:"
echo "  1. Create .env.docker from .env.docker.template"
echo "  2. Add your ANTHROPIC_API_KEY to .env.docker"
echo "  3. Start services: docker-compose --env-file .env.docker up -d"
echo ""
