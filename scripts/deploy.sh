#!/bin/zsh
# Rebuilds the production site and restarts the always-on service.
# Run this after making code changes locally:
#   ./scripts/deploy.sh
set -e
cd /Users/dennis/lam_projects/project-lam-fam-business
npm run build
launchctl kickstart -k "gui/$(id -u)/com.lamfamily.catalog"
echo "Deployed. Site is live at https://lamfamily.duckdns.org"