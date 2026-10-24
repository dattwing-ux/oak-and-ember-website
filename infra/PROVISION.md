# Provisioning — oakandemberpress.com on Oracle Cloud

Target: $0/month inside Always Free. About 45 minutes end to end, most of it waiting on DNS.

## 0. What you end up with

| Piece | Where | Cost |
|---|---|---|
| The existing `ebook-pipeline` A1 VM, nginx + certbot | OCI | Already running; $0 extra |
| DNS, CDN, DDoS cover, email forwarding | Cloudflare (free plan) | Free |
| HTTPS | Let's Encrypt via certbot | Free |
| Deploys | GitHub Actions on push to `main` | Free |
| `hello@oakandemberpress.com` | Cloudflare Email Routing → your Gmail | Free |

## 1. Cloudflare first (so DNS is ready when the VM is)

1. Add the site at dash.cloudflare.com → **Add a domain** → `oakandemberpress.com` → Free plan.
2. Cloudflare shows two nameservers. At your registrar, replace the existing nameservers with those two. Propagation: minutes to a few hours.
3. In **SSL/TLS → Overview**, set mode to **Full (strict)**. Caddy will hold a real certificate, so strict is correct.
4. Leave the DNS records for later (step 3). Don't add an A record yet.

## 2. The VM — the existing `ebook-pipeline` instance (132.145.134.136)

Ubuntu 24.04 on Ampere, nginx already on port 80, n8n in Docker on 5678. The site is served by
that nginx; nothing about the pipeline changes. (`infra/alt-caddy/` keeps the fresh-VM recipe.)

On the VM, as `ubuntu`:
```bash
git clone https://github.com/dattwing-ux/oak-and-ember-website ~/oak-and-ember-website   # or git pull
cd ~/oak-and-ember-website
sudo bash infra/install-nginx.sh "<contents of oe_deploy.pub>"
```
Then, once the A record resolves and the VCN ports are open (2b):
```bash
sudo certbot --nginx -d oakandemberpress.com -d www.oakandemberpress.com --redirect -m hello@oakandemberpress.com --agree-tos -n
```
certbot renews itself (systemd timer). Done when `curl -I https://oakandemberpress.com/` returns 200.

### 2b. Open the ports in the VCN

OCI console (`cloud.oracle.com`) → Compute → Instances → `ebook-pipeline` → subnet link → Security
Lists → Default → **Add Ingress Rules**:

| Source | Protocol | Dest port |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

Port 80 may already be open if n8n or nginx is reached from the internet. 443 almost certainly is not.

## 3. DNS records (Cloudflare → DNS → Records)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `132.145.134.136` | DNS only until certbot has run, then Proxied |
| CNAME | `www` | `oakandemberpress.com` | Proxied |

certbot needs Let's Encrypt to reach port 80 on the VM directly, so keep both records **DNS only** (grey cloud) until the certificate is issued, then switch them to **Proxied** (orange) for CDN and DDoS cover. Renewals work through the proxy.

## 4. GitHub secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `OCI_HOST` | `132.145.134.136` (the IP, not the domain; the proxy would intercept SSH) |
| `OCI_USER` | `deploy` |
| `OCI_SSH_KEY` | contents of `~/.ssh/oe_deploy` (the private key) |

Push to `main` or run the **Deploy** workflow manually. First run takes ~2 minutes. The site is live when `https://oakandemberpress.com` shows the ember mark.

## 5. Email on the domain (needed to sign up at Etsy and elsewhere)

Goal now: an address that **receives** reliably so platform verification works. Cloudflare Email Routing does that for free in ten minutes.

1. Cloudflare → **Email → Email Routing → Get started**. Cloudflare adds the MX and SPF records itself.
2. Destination address: your Gmail. Verify the confirmation email.
3. Create addresses:
   - `hello@oakandemberpress.com` → Gmail (public-facing, for the site footer)
   - `shop@oakandemberpress.com` → Gmail (use this for Etsy, Pinterest, Instagram signups so platform mail is filterable)
   - `press@oakandemberpress.com` → Gmail
   - Turn **on** catch-all → Gmail, so a typo'd address still arrives.
4. Add a DMARC record so forwarded mail isn't junked: `TXT  _dmarc  v=DMARC1; p=none; rua=mailto:dmarc@oakandemberpress.com` (and route `dmarc@` to Gmail too).

**Sending as the brand.** Email Routing is receive-only. To reply from `hello@` inside Gmail: Gmail → Settings → Accounts → **Send mail as** → add `hello@oakandemberpress.com`, SMTP `smtp.gmail.com`, port 587, your Gmail address and an **App Password** (Google Account → Security → 2-Step Verification → App passwords). Then add Google to SPF: edit the SPF TXT record Cloudflare created to `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`.

When the shop is earning, a real mailbox (Zoho Mail free tier, or Google Workspace at ~$7/user/month) replaces the forwarding without changing any address.

## 6. Rebuilding from nothing

On any Ubuntu box with nginx: clone the repo, run `infra/install-nginx.sh`, run certbot, update the A record, re-run the Deploy workflow. Fifteen minutes. `infra/alt-caddy/` has a cloud-init for a fresh VM without nginx.
