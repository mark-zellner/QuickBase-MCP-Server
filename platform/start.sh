#!/bin/bash

# QuickBase Codepage Platform Startup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${NODE_ENV:-development}
PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 Starting QuickBase Codepage Platform...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Platform Directory: ${PLATFORM_DIR}${NC}"

# Function to check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        echo -e "${YELLOW}💡 Please install Node.js 18+ from https://nodejs.org${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version $NODE_VERSION is not supported${NC}"
        echo -e "${YELLOW}💡 Please upgrade to Node.js 18+ from https://nodejs.org${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js version $NODE_VERSION detected${NC}"
}

# Function to check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm version $NPM_VERSION detected${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    cd "$PLATFORM_DIR"
    
    # Install root dependencies
    echo -e "${BLUE}📦 Installing root dependencies...${NC}"
    npm install
    
    # Install workspace dependencies
    echo -e "${BLUE}📦 Installing workspace dependencies...${NC}"
    npm run build:shared
    
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
}

# Function to validate environment
validate_environment() {
    echo -e "${YELLOW}🔍 Validating environment configuration...${NC}"
    
    ENV_FILE="$PLATFORM_DIR/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Environment file .env not found${NC}"
        echo -e "${YELLOW}💡 Please copy .env.example to .env and configure it${NC}"
        exit 1
    fi
    
    # Source environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check required environment variables
    REQUIRED_VARS=("QB_REALM" "QB_USER_TOKEN" "QB_APP_ID" "JWT_SECRET")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}❌ Required environment variable $var is not set${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Function to build the application
build_application() {
    echo -e "${YELLOW}🏗️  Building application...${NC}"
    
    cd "$PLATFORM_DIR"
    
    # Build shared package first
    echo -e "${BLUE}📦 Building shared package...${NC}"
    npm run build:shared
    
    # Build backend
    echo -e "${BLUE}🔧 Building backend...${NC}"
    npm run build:backend
    
    # Build frontend
    echo -e "${BLUE}🎨 Building frontend...${NC}"
    npm run build:frontend
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Function to start services in development mode
start_development() {
    echo -e "${YELLOW}🔧 Starting development services...${NC}"
    
    cd "$PLATFORM_DIR"
    
    # Start both frontend and backend in development mode
    npm run dev
}

# Function to start services in production mode
start_production() {
    echo -e "${YELLOW}🏭 Starting production services...${NC}"
    
    cd "$PLATFORM_DIR"
    
    # Start backend in production mode
    echo -e "${BLUE}🚀 Starting backend server...${NC}"
    cd backend
    npm start &
    BACKEND_PID=$!
    
    # Start frontend server (if not using external web server)
    echo -e "${BLUE}🌐 Starting frontend server...${NC}"
    cd ../frontend
    npm run preview &
    FRONTEND_PID=$!
    
    # Wait for services to start
    sleep 5
    
    # Check if services are running
    if kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Services started successfully${NC}"
        echo -e "${BLUE}📊 Service Information:${NC}"
        echo -e "  Backend: http://localhost:${PORT:-3001}"
        echo -e "  Frontend: http://localhost:${FRONTEND_PORT:-4173}"
        echo -e "  Health Check: http://localhost:${PORT:-3001}/api/health"
        
        # Wait for services
        wait $BACKEND_PID $FRONTEND_PID
    else
        echo -e "${RED}❌ Failed to start services${NC}"
        exit 1
    fi
}

# Function to handle cleanup on script exit
cleanup() {
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Main startup flow
main() {
    check_node
    check_npm
    validate_environment
    install_dependencies
    
    if [ "$ENVIRONMENT" = "production" ]; then
        build_application
        start_production
    else
        start_development
    fi
}

# Handle command line arguments
case "${1:-}" in
    "dev"|"development")
        ENVIRONMENT="development"
        ;;
    "prod"|"production")
        ENVIRONMENT="production"
        ;;
    "build")
        check_node
        check_npm
        validate_environment
        install_dependencies
        build_application
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [dev|prod|build|help]"
        echo ""
        echo "Commands:"
        echo "  dev, development  Start in development mode (default)"
        echo "  prod, production  Start in production mode"
        echo "  build            Build the application only"
        echo "  help             Show this help message"
        exit 0
        ;;
    "")
        # No argument provided, use environment variable or default
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

# Run main function
main

echo -e "${GREEN}🎉 QuickBase Codepage Platform is ready!${NC}"