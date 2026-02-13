#!/bin/bash
set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_REPO="https://github.com/nobbie2009/infra.git"

print_header() {
    echo ""
    echo "================================"
    echo "$1"
    echo "================================"
}

print_error() {
    echo "❌ $1"
}

setup_git() {
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        echo "Initializing Git repository..."
        cd "$PROJECT_DIR"
        git init
        git remote add origin "$GIT_REPO"
        git fetch origin
        
        # Check if master branch exists locally, if not create it tracking remote
        if ! git show-ref --verify --quiet refs/heads/master; then
            git checkout -b master origin/master
        else
            git branch --set-upstream-to=origin/master master
        fi
    fi
}

check_credentials() {
    # Try a dry-run fetch to see if we have access
    if git ls-remote "$GIT_REPO" HEAD >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

setup_credentials() {
    print_header "🔐 GITHUB AUTHENTICATION"
    echo "Access to the repository requires authentication."
    echo "Please enter your GitHub Username and Personal Access Token (PAT)."
    echo "These will be stored securely using 'git credential-store'."
    echo ""
    
    read -p "GitHub Username: " GIT_USER
    read -s -p "GitHub Token (PAT): " GIT_TOKEN
    echo ""

    # Configure git to use store helper
    git config --global credential.helper store
    
    # Manually store credentials
    # The format expected by git-credential-store is strict
    # We use a temporary file to feed git credential approve to avoid history logging
    
    cat <<EOF | git credential approve
protocol=https
host=github.com
username=$GIT_USER
password=$GIT_TOKEN
EOF

    echo "Credentials stored!"
}

main() {
    print_header "🚀 INFRASTRUKTUR-MANAGER UPDATE SCRIPT"

    cd "$PROJECT_DIR"

    # 1. Setup Git if needed
    setup_git

    # 2. Check and Setup Credentials
    if ! check_credentials; then
        setup_credentials
        
        # Verify again
        if ! check_credentials; then
            print_error "Authentication failed. Please check your token and try again."
            exit 1
        fi
    fi

    # 3. Fetch and Pull
    echo "Fetching updates from GitHub..."
    if ! git fetch origin; then
        print_error "Failed to fetch from remote."
        exit 1
    fi

    echo "Status of local changes:"
    echo "------------------------"
    git status -s
    echo "------------------------"

    # Auto-confirm pull
    echo "Auto-confirming update..."

    # Check for local changes that would be overwritten
    if ! git diff-index --quiet HEAD --; then
         echo "⚠️  Local changes detected. Auto-resetting to match remote..."
         git reset --hard origin/master
         git clean -fd
    fi
     
    echo "Pulling updates..."
    if ! git pull origin master; then
        print_error "Pull failed."
        exit 1
    fi
    
    echo "Rebuilding containers..."
    # Try docker compose link, fall back to docker-compose
    if command -v docker-compose &> /dev/null; then
        if ! docker-compose up -d --build; then
            print_error "Docker build failed."
            exit 1
        fi
    else
         if ! docker compose up -d --build; then
            print_error "Docker build failed."
            exit 1
        fi
    fi
    
    echo "✅ Update complete!"
}

main "$@"
