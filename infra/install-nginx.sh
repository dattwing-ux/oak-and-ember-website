#!/usr/bin/env bash
# Set up the Oak & Ember site on an existing Ubuntu VM that already runs nginx.
# Idempotent. Run as root from the repo's infra/ directory:
#
#   sudo bash infra/install-nginx.sh "<contents of oe_deploy.pub>"
#
# Does: deploy user + site root, nginx site config, sudo rule so deploy can reload nginx,
# OS firewall 80/443, then certbot for HTTPS (needs the Cloudflare A record to point here, DNS only).
set -euo pipefail
PUBKEY="${1:-}"
SITE_DIR=/srv/www/oakandemberpress.com
HERE="$(cd "$(dirname "$0")" && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "run with sudo"; exit 1; }
[ -n "$PUBKEY" ] || { echo "usage: $0 \"<contents of oe_deploy.pub>\""; exit 1; }
command -v nginx >/dev/null || { echo "nginx not installed; this script expects the existing nginx"; exit 2; }

apt-get install -y -qq rsync certbot python3-certbot-nginx >/dev/null

# deploy user, key, site root
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qF "$PUBKEY" /home/deploy/.ssh/authorized_keys || echo "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys; chown deploy:deploy /home/deploy/.ssh/authorized_keys
install -d -m 755 -o deploy -g deploy "$SITE_DIR"
[ -f "$SITE_DIR/index.html" ] || echo '<!doctype html><title>Oak and Ember Press</title><p style="font-family:serif;padding:2rem">Oak &amp; Ember Press — provisioning.' > "$SITE_DIR/index.html"
chown -R deploy:deploy "$SITE_DIR"

# deploy may reload nginx, nothing else
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx' > /etc/sudoers.d/deploy-nginx
chmod 440 /etc/sudoers.d/deploy-nginx

# nginx site
install -m 644 "$HERE/nginx-oakandemberpress.conf" /etc/nginx/sites-available/oakandemberpress.conf
ln -sf /etc/nginx/sites-available/oakandemberpress.conf /etc/nginx/sites-enabled/oakandemberpress.conf
nginx -t
systemctl reload nginx

# OS firewall (Oracle images reject 80/443 by default)
if iptables -S INPUT | grep -q REJECT; then
  for rule in "-p tcp --dport 80" "-p tcp --dport 443"; do
    iptables -C INPUT -m state --state NEW $rule -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW $rule -j ACCEPT
  done
  command -v netfilter-persistent >/dev/null && netfilter-persistent save || iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

echo
echo "HTTP is up. Test from your PC:  curl -i http://oakandemberpress.com/"
echo "When that works (A record live, VCN ports open), get the certificate:"
echo "  sudo certbot --nginx -d oakandemberpress.com -d www.oakandemberpress.com --redirect -m hello@oakandemberpress.com --agree-tos -n"
