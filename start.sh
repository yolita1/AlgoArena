#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# AlgoArena — one-command local dev launcher
# Usage: ./start.sh
# ──────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

banner() {
  echo -e "\n${CYAN}${BOLD}"
  echo "  █████╗ ██╗      ██████╗  ██████╗  █████╗ ██████╗ ███████╗███╗   ██╗ █████╗ "
  echo " ██╔══██╗██║     ██╔════╝ ██╔═══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗"
  echo " ███████║██║     ██║  ███╗██║   ██║███████║██████╔╝█████╗  ██╔██╗ ██║███████║"
  echo " ██╔══██║██║     ██║   ██║██║   ██║██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║"
  echo " ██║  ██║███████╗╚██████╔╝╚██████╔╝██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║"
  echo " ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝"
  echo -e "${RESET}"
}

check_dep() {
  local cmd=$1 label=$2 install_hint=$3
  if command -v "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} $label"
  else
    echo -e "  ${RED}✗${RESET} $label — ${YELLOW}$install_hint${RESET}"
    MISSING=1
  fi
}

banner

echo -e "${BOLD}Checking dependencies...${RESET}"
MISSING=0
check_dep node    "Node.js ≥ 18"   "https://nodejs.org"
check_dep npm     "npm"             "bundled with Node.js"
check_dep gcc     "gcc"             "sudo apt install gcc  OR  brew install gcc"
check_dep python3 "Python 3"        "usually pre-installed, or https://python.org"
check_dep ocaml   "OCaml"           "sudo apt install ocaml  OR  brew install ocaml"

if [ "$MISSING" = "1" ]; then
  echo -e "\n${YELLOW}⚠ Some dependencies are missing. C / OCaml submissions won't execute without them.${RESET}"
  echo -e "${YELLOW}  Python will still work. Install the missing tools and re-run.${RESET}\n"
fi


# Create backend/.env if it doesn't exist
if [ ! -f "backend/.env" ]; then
  echo -e "\n${YELLOW}→ backend/.env not found — creating from .env.example${RESET}"
  cp backend/.env.example backend/.env
  echo -e "  ${GREEN}✓${RESET} Created backend/.env — edit it to set your secrets before deploying!"
fi

# Install node_modules if needed
for dir in backend frontend; do
  if [ ! -d "$dir/node_modules" ]; then
    echo -e "\n${CYAN}→ Installing $dir dependencies...${RESET}"
    (cd "$dir" && npm install --silent)
  fi
done

# Create temp dir
mkdir -p temp

echo -e "\n${GREEN}${BOLD}Starting AlgoArena...${RESET}"
echo -e "  Backend  →  ${CYAN}http://localhost:3001${RESET}"
echo -e "  Frontend →  ${CYAN}http://localhost:5173${RESET}"
echo -e "\nPress ${BOLD}Ctrl+C${RESET} to stop both servers.\n"

# Trap so both processes die on Ctrl+C
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${RESET}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
cd backend
npm run dev 2>&1 | sed 's/^/[backend] /' &
BACKEND_PID=$!
cd ..

# Wait a beat for backend to initialise
sleep 2

# Start frontend
cd frontend
npm run dev 2>&1 | sed 's/^/[frontend] /' &
FRONTEND_PID=$!
cd ..

wait
