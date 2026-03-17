#!/usr/bin/env bash
# setup.sh — Install dependencies and start BingX Micro Trader

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║       BINGX MICRO TRADER — SETUP             ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${RESET}"
  exit 1
fi
NODE_VER=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VER}${RESET}"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}✗ npm not found.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${RESET}"
echo ""

# Create database directory
mkdir -p database
echo -e "${GREEN}✓ Database directory ready${RESET}"

# Check settings
if [ ! -f "backend/config/settings.js" ]; then
  cp backend/config/settings.example.js backend/config/settings.js
  echo -e "${YELLOW}⚠  Created backend/config/settings.js — please add your API keys!${RESET}"
else
  echo -e "${GREEN}✓ Settings file exists${RESET}"
fi

echo ""
echo -e "${CYAN}Installing root dependencies...${RESET}"
npm install --silent

echo -e "${CYAN}Installing backend dependencies...${RESET}"
cd backend && npm install --silent && cd ..

echo -e "${CYAN}Installing frontend dependencies...${RESET}"
cd frontend && npm install --silent && cd ..

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║  ✓ All dependencies installed                ║${RESET}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${YELLOW}Before starting, edit:  backend/config/settings.js${RESET}"
echo -e "${YELLOW}  → BINGX_API_KEY${RESET}"
echo -e "${YELLOW}  → BINGX_API_SECRET${RESET}"
echo -e "${YELLOW}  → TELEGRAM_BOT_TOKEN  (optional)${RESET}"
echo -e "${YELLOW}  → TELEGRAM_CHAT_ID    (optional)${RESET}"
echo ""
echo -e "${CYAN}To start the bot:${RESET}  npm run dev"
echo -e "${CYAN}Dashboard:${RESET}         http://localhost:3000"
echo -e "${CYAN}API:${RESET}               http://localhost:4000"
echo ""
