#!/usr/bin/env bash
# Quick start script for Docker deployment

set -e

echo "==================================="
echo "Rad Engineer - Docker Quick Start"
echo "==================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running"
    echo "Please start Docker/OrbStack and try again"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Check for .env.docker
if [ ! -f ".env.docker" ]; then
    echo "Creating .env.docker from template..."
    cp .env.docker.template .env.docker
    echo "✓ Created .env.docker"
    echo ""
    echo "⚠ IMPORTANT: Edit .env.docker and add your ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter to open .env.docker in your editor (or Ctrl+C to exit)..."
    ${EDITOR:-nano} .env.docker
    echo ""
fi

# Validate ANTHROPIC_API_KEY is set
if ! grep -q "^ANTHROPIC_API_KEY=..*" .env.docker; then
    echo "ERROR: ANTHROPIC_API_KEY is not set in .env.docker"
    echo "Please edit .env.docker and add your API key"
    exit 1
fi

echo "✓ ANTHROPIC_API_KEY is configured"
echo ""

# Build and start services
echo "Building and starting services..."
echo ""
docker-compose --env-file .env.docker up -d --build

echo ""
echo "==================================="
echo "✓ Services Started Successfully"
echo "==================================="
echo ""
echo "Services:"
echo "  • Rad Engineer:    http://localhost:3000"
echo "  • Metrics:         http://localhost:9090/metrics"
echo "  • Prometheus UI:   http://localhost:9091"
echo "  • Grafana UI:      http://localhost:3001 (admin/admin)"
echo ""
echo "Check status:   docker-compose ps"
echo "View logs:      docker-compose logs -f"
echo "Stop services:  docker-compose down"
echo ""
echo "For detailed documentation, see DOCKER.md"
echo ""
