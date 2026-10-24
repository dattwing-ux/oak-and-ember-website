#!/usr/bin/env bash
# Install the Oak & Ember site host onto an EXISTING Ubuntu/Debian or Oracle Linux VM.
# Idempotent: safe to re-run. Run as root (sudo -i) on the VM:
#
#   sudo bash install-on-existing.sh "<deploy public key>"
#
# What it does: installs Caddy, creates the `deploy` user that GitHub Actions rsyncs as,
# creates /srv/www/oakandemberpress.com, lets deploy reload Caddy without a password,
# opens 80/443 in the OS firewall, and starts Caddy with a placeholder page.
# It refuses to continue if something else already listens on 80 or 443.
set -euo pipefail

PUBKEY="${1:-}"
SITE_DIR=/srv/www/oakandemberpress.com
[ "$(id -u)" -eq 0 ] || { echo "run with sudo"; exit 1; }
[ -n "$PUBKEY" ] || { echo "usage: $0 \"<contents of oe_deploy.pub>\""; exit 1; }

# 1. Port check: Caddy must own 80 and 443.
busy=$(ss -ltnpH 'sport = :80 or sport = :443' 2>/dev/null | grep -v caddy || true)
if [ -n "$busy" ]; then
  echo "Ports 80/443 are in use by something other than Caddy:"; echo "$busy"
  echo "Stop/move that service (or tell Claude what it is) before continuing."; exit 2
fi

# 2. Caddy
if ! command -v caddy >/dev/null; then
  if command -v apt-get >/dev/null; then
    apt-get update -qq
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl rsync
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy
  elif command -v dnf >/dev/null; then
    dnf install -y -q 'dnf-command(copr)' rsync
    dnf copr enable -y @caddy/caddy
    dnf install -y -q caddy
  else
    echo "unsupported distro: install Caddy manually"; exit 3
  fi
fi

# 3. Deploy user and site root
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash -G www-data deploy 2>/dev/null || useradd -m -s /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qF "$PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys; chown deploy:deploy /home/deploy/.ssh/authorized_keys
install -d -m 755 -o deploy -g deploy "$SITE_DIR"
install -d -m 755 -o caddy -g caddy /var/log/caddy
cat > /etc/sudoers.d/deploy-caddy <<'SUDO'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload caddy, /usr/bin/install -m 644 -o root -g root /home/deploy/Caddyfile /etc/caddy/Caddyfile
SUDO
chmod 440 /etc/sudoers.d/deploy-caddy

# 4. Placeholder page until the first deploy
[ -f "$SITE_DIR/index.html" ] || echo '<!doctype html><title>Oak and Ember Press</title><p style="font-family:serif;padding:2rem">Oak &amp; Ember Press — provisioning.' > "$SITE_DIR/index.html"
chown deploy:deploy "$SITE_DIR/index.html"

# 5. Caddyfile: use the repo one if it sits next to this script, else a minimal HTTP placeholder
if [ -f "$(dirname "$0")/Caddyfile" ]; then
  install -m 644 "$(dirname "$0")/Caddyfile" /etc/caddy/Caddyfile
else
  printf ':80 {\n\troot * %s\n\tfile_server\n}\n' "$SITE_DIR" > /etc/caddy/Caddyfile
fi

# 6. OS firewall: Oracle images drop 80/443 by default.
if command -v iptables >/dev/null && iptables -S INPUT | grep -q REJECT; then
  for rule in "-p tcp --dport 80" "-p tcp --dport 443" "-p udp --dport 443"; do
    iptables -C INPUT -m state --state NEW $rule -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW $rule -j ACCEPT
  done
  if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; 
  elif [ -d /etc/iptables ]; then iptables-save > /etc/iptables/rules.v4; fi
fi
if command -v firewall-cmd >/dev/null && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http --add-service=https >/dev/null; firewall-cmd --reload >/dev/null
fi

systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy
echo
echo "OK. Public IP: $(curl -4 -s ifconfig.me || echo '?')"
echo "Test from your PC:  curl -i http://$(curl -4 -s ifconfig.me)/"
echo "Remember the VCN security list: ingress TCP 80, TCP 443, UDP 443 from 0.0.0.0/0."
