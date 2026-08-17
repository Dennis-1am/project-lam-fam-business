#!/bin/zsh
# Keeps your DuckDNS subdomain pointed at this Mac's current public IP.
# 1. Create a free account and a subdomain at https://duckdns.org
# 2. Set DUCKDNS_TOKEN in your shell environment (e.g. in ~/.zshenv).
# 3. Make sure the domain below matches the one in /opt/homebrew/etc/Caddyfile.
TOKEN="${DUCKDNS_TOKEN}"
DOMAIN="lamfamily"

if [[ -z "$TOKEN" ]]; then
  echo "duckdns-update: TOKEN not set yet" >> "$HOME/Library/Logs/duckdns-update.log"
  exit 0
fi

curl -s -k "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=" >> "$HOME/Library/Logs/duckdns-update.log"
echo " ($(date))" >> "$HOME/Library/Logs/duckdns-update.log"