#!/bin/bash

# QuickBase Codepage Platform Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🚀 Starting QuickBase Codepage Platform deployment...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Function to check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Function to validate environment variables
validate_environment() {
    echo -e "${YELLOW}🔍 Validating environment configuration...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Environment file $ENV_FILE not found${NC}"
        echo -e "${YELLOW}💡 Please copy .env.example to .env and configure it${NC}"
        exit 1
    fi
    
    # Check required environment variables
    source "$ENV_FILE"
    
    REQUIRED_VARS=("QB_REALM" "QB_USER_TOKEN" "QB_APP_ID" "JWT_SECRET")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Required environment variable $var is not set${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Function to build and start services
deploy_services() {
    echo -e "${YELLOW}🏗️  Building and starting services...${NC}"
    
    # Build shared package first
    echo -e "${BLUE}📦 Building shared package...${NC}"
    cd shared && npm run build && cd ..
    
    # Stop existing services
    echo -e "${BLUE}🛑 Stopping existing services...${NC}"
    docker-compose down --remove-orphans
    
    # Build and start services
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${BLUE}🏭 Starting production services...${NC}"
        docker-compose --profile production up --build -d
    else
        echo -e "${BLUE}🔧 Starting development services...${NC}"
        docker-compose up --build -d
    fi
    
    echo -e "${GREEN}✅ Services started successfully${NC}"
}

# Function to wait for services to be healthy
wait_for_services() {
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    
    # Wait for backend health check
    echo -e "${BLUE}🔍 Checking backend health...${NC}"
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health &> /dev/null; then
            echo -e "${GREEN}✅ Backend is healthy${NC}"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Backend health check failed${NC}"
            docker-compose logs backend
            exit 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for backend... (attempt $i/30)${NC}"
        sleep 2
    done
    
    # Wait for frontend
    echo -e "${BLUE}🔍 Checking frontend...${NC}"
    for i in {1..30}; do
        if curl -f http://localhost:3000 &> /dev/null; then
            echo -e "${GREEN}✅ Frontend is accessible${NC}"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Frontend accessibility check failed${NC}"
            docker-compose logs frontend
            exit 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for frontend... (attempt $i/30)${NC}"
        sleep 2
    done
}

# Function to run post-deployment tasks
post_deployment() {
    echo -e "${YELLOW}🔧 Running post-deployment tasks...${NC}"
    
    # Create logs directory if it doesn't exist
    mkdir -p logs/nginx
    
    # Set proper permissions
    chmod 755 logs
    
    echo -e "${GREEN}✅ Post-deployment tasks completed${NC}"
}

# Function to display deployment information
show_deployment_info() {
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}📊 Service Information:${NC}"
    echo -e "  Frontend: http://localhost:3000"
    echo -e "  Backend API: http://localhost:3001/api"
    echo -e "  WebSocket: ws://localhost:3002"
    echo -e "  Health Check: http://localhost:3001/api/health"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "  Nginx Proxy: http://localhost"
    fi
    
    echo -e "${BLUE}📋 Useful Commands:${NC}"
    echo -e "  View logs: docker-compose logs -f [service]"
    echo -e "  Stop services: docker-compose down"
    echo -e "  Restart service: docker-compose restart [service]"
    echo -e "  View status: docker-compose ps"
}

# Function to handle cleanup on script exit
cleanup() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Deployment failed${NC}"
        echo -e "${YELLOW}📋 Checking service logs...${NC}"
        docker-compose logs --tail=50
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    check_dependencies
    validate_environment
    deploy_services
    wait_for_services
    post_deployment
    show_deployment_info
}

# Run main function
main

echo -e "${GREEN}🚀 QuickBase Codepage Platform is ready!${NC}"