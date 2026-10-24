# Provisioning — oakandemberpress.com on Oracle Cloud

Target: $0/month inside Always Free. About 45 minutes end to end, most of it waiting on DNS.

## 0. What you end up with

| Piece | Where | Cost |
|---|---|---|
| VM `VM.Standard.A1.Flex`, 2 OCPU / 12 GB, Ubuntu 24.04 minimal, Caddy | OCI | Free (Always Free: up to 4 OCPU / 24 GB, 200 GB storage, 10 TB egress) |
| DNS, CDN, DDoS cover, email forwarding | Cloudflare (free plan) | Free |
| HTTPS | Let's Encrypt via Caddy | Free |
| Deploys | GitHub Actions on push to `main` | Free |
| `hello@oakandemberpress.com` | Cloudflare Email Routing → your Gmail | Free |

## 1. Cloudflare first (so DNS is ready when the VM is)

1. Add the site at dash.cloudflare.com → **Add a domain** → `oakandemberpress.com` → Free plan.
2. Cloudflare shows two nameservers. At your registrar, replace the existing nameservers with those two. Propagation: minutes to a few hours.
3. In **SSL/TLS → Overview**, set mode to **Full (strict)**. Caddy will hold a real certificate, so strict is correct.
4. Leave the DNS records for later (step 3). Don't add an A record yet.

## 2. The VM

1. OCI Console → **Compute → Instances → Create instance**.
2. Name: `oe-web`. Placement: any AD. If creation fails with *Out of host capacity*, pick another AD or retry later; A1 capacity comes and goes.
3. Image: **Ubuntu 24.04 Minimal (aarch64)**. Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPUs, 12 GB.
4. Networking: create a new VCN with internet connectivity (the wizard default), **assign a public IPv4**.
5. SSH keys: generate a new pair for deploys on your machine:
   ```bash
   ssh-keygen -t ed25519 -C deploy@oakandemberpress -f ~/.ssh/oe_deploy
   ```
   Upload **your own** key for `ubuntu` login in the console as usual. The deploy key is separate.
6. **Advanced options → Management → Cloud-init script**: paste `infra/cloud-init.yaml` with `DEPLOY_PUBKEY` replaced by the contents of `~/.ssh/oe_deploy.pub`.
7. Create. Note the public IP.

### 2b. Open the ports in the VCN

Networking → Virtual cloud networks → your VCN → **Security Lists → Default** → Add ingress rules:

| Source | Protocol | Dest port |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |
| 0.0.0.0/0 | UDP | 443 (HTTP/3) |

The OS firewall is handled by cloud-init. If `curl http://<ip>` still hangs after five minutes, SSH in and run `sudo iptables -L INPUT -n --line-numbers`; the ACCEPT rules for 80/443 must sit above the REJECT line.

Smoke test: `curl -i http://<public-ip>/` returns `Oak & Ember Press — provisioning`.

## 3. DNS records (Cloudflare → DNS → Records)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `<public-ip>` | Proxied (orange) |
| CNAME | `www` | `oakandemberpress.com` | Proxied |

Caddy needs to reach Let's Encrypt on first start. With the proxy on, it uses the TLS-ALPN/HTTP challenge through Cloudflare, which works when the SSL mode is Full (strict). If issuance fails, temporarily switch both records to **DNS only**, let Caddy get its certificate, then re-enable the proxy.

## 4. GitHub secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `OCI_HOST` | the public IP (not the domain; the proxy would intercept SSH) |
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

Terminate the VM, repeat step 2 with the same cloud-init, update the A record, re-run the Deploy workflow. Fifteen minutes.
