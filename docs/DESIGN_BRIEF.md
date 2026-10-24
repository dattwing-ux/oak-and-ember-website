# Oak & Ember Press — Website Design Brief

Status: proposal for owner review · 2026-10-24
Repo: `dattwing-ux/oak-and-ember-website` · Host: Oracle Cloud (pay-as-you-go account, Always Free tier)

## 1. What the site is for

Oak & Ember Press sells printable binders, workbooks, planners and (soon) fiction on Etsy, with
a kids' animated sub-brand (The Oak & Ember Crew) on the side. The pipeline in `ebook-pipeline`
produces every product and its gallery images automatically.

The site's one job: make a stranger who lands from Etsy, Pinterest or Instagram believe this
is a real press with a point of view, then send them to the product. Secondary jobs: collect
emails, give the brand a home that isn't a marketplace, and later sell direct.

Source material used: brand strategy (Drive, 2026-09), signature voice doc, voice-and-tone rules,
the gold logo in `ebook-pipeline/assets/brand/`, the eight binder specs in
`ebook-pipeline/templates/workbooks/`, and the Aug-2026 Crew hero prototype (dark forest, embers).

## 2. Brand facts the design must honor

| Element | Value |
|---|---|
| Palette | Deep Forest `#0F2C23` · Warm Oak `#4A3728` · Ember Gold `#C9A961` · Soft Cream `#FDF8F0` · Muted Burgundy `#6B2D3C` |
| Logo | Gold oak leaf with a single flame, serif wordmark "Oak and Ember Press". Measured gold: `#C8A96E`. |
| Tagline | "Rooted in strength. Ignited by story." |
| Voice | Warm but restrained. Concrete before abstract. Short sentences land. No "but here's the thing" filler. No spelled-out morals. |
| Audience | 28–55, buys beautiful useful objects, slow living, homesteading, journaling, Bookstagram. |
| Products today | 8 binders (estate/legacy, genealogy, home inventory, renovation, livestock, food preservation, soap/candle, sourdough micro-bakery), planners, recipe packs. Letter + A4, standard + large-print. |

## 3. Three theme directions

### A. The Bindery (recommended)
Paper by day, hearth by night. The page is a cream linen cover; the mark is foil-stamped gold
that catches light as you move. Products stand as binder spines on an oak shelf. The page
ends in a dark forest "hearth" band with drifting embers where the newsletter lives.

- Why it wins: it photographs the products honestly (printables look right on paper, not on
  black), it is the only direction that uses the logo as foil the way the strategy doc wants
  ("suitable for foil stamping on hardcover spines"), and the dark hearth ending ties the Press
  to the Crew without making the whole site a kids' site.
- Risk: cream + serif is a crowded look. We beat it with material, not color: linen grain,
  debossed section titles, real binder geometry, foil that moves.

### B. Hearth at Dusk
Full dark. Forest green, ember particles everywhere, cinematic. An evolution of the 2026-08 Crew
hero prototype.
- Pro: dramatic, memorable, already half-built.
- Con: reads as the kids' brand; printable previews look dull on dark; gold on dark green is
  the single most common "luxury" template on the web right now.

### C. Field Notes
Editorial white, big serif, Appalachian photography, journal-first.
- Pro: fastest to build, ages well.
- Con: looks like every Substack. Nothing a reader would describe to a friend.

Decision requested: A, unless you want B's mood as the whole site. A keeps B as its final act.

## 4. The Bindery, in detail

### Signature moments (the parts people remember)
1. **Foil hero.** The gold mark sits large on a cream linen cover. A soft specular sweep crosses
   the gold as the pointer moves (phone: on tilt, or a slow idle sweep). One line beneath:
   "Rooted in strength. Ignited by story." Then two buttons: Browse the shelf · Read a story.
2. **The Shelf.** Every product is a binder spine standing on an oak plank, spine color from the
   product's YAML `cover.color`. Hover or tap pulls the binder forward and opens it to its real
   preview card (the 3000×2250 gallery cards step 07 already renders). No fake mockups.
3. **Debossed headings.** Section titles look pressed into the paper (double text-shadow,
   slightly darker cream). Cheap to build, instantly "printed object".
4. **The Hearth.** Last band: deep forest, a few hundred slow embers on canvas, the Crew
   characters' names in small caps, newsletter form. The site literally goes from day to night.
5. **Ridge rule.** Section dividers are a thin Appalachian ridgeline SVG instead of a line.

### Type
- Display: **Cormorant Garamond** (closest to the logo's letterforms; long extenders, high contrast). Weight 500–600, tight tracking, italic for the one emphasized word.
- Body: **Source Serif 4** at 17–18px, 1.6 line-height, 65ch measure.
- Utility (labels, prices, nav): **Source Sans 3**, small caps with letter-spacing.

### Color use
- Cream is the page. Forest is the ink. Gold is only the mark, one hero word, and hover states.
- Oak brown is the shelf and binder leather. Burgundy is reserved for the fiction line.
- Dark theme = the Hearth palette applied to the whole page (forest ground, cream ink, gold unchanged).

### Motion
One orchestrated load (cover settles, foil sweeps once, shelf slides in), then only hover
micro-interactions and the ember field. All of it off under `prefers-reduced-motion`.

## 5. Site map (v1)

| Route | Purpose |
|---|---|
| `/` | Foil hero → Shelf (featured 4) → "How we make them" (3 steps, honest about the process) → Lines (Binders / Planners / Stories / The Crew) → Hearth |
| `/binders/` | Full shelf, filter by room-of-life (Home · Homestead · Kitchen · Family · Legacy) |
| `/binders/<slug>/` | Cover, one-paragraph description (from YAML), what's inside (from `previews`), page count, Letter/A4, Standard/Large-print, gallery, **Buy on Etsy** |
| `/planners/` | Same pattern |
| `/stories/` | Fiction line. Holding page with the signature voice sample until the first title ships |
| `/crew/` | Kids' sub-brand. Dark page. Links to YouTube. Hands off to the Crew site later |
| `/about/` | The press, the ridge, the pipeline (we say the books are made with AI tooling where the platform requires it; the site matches the listings) |
| `/journal/` | Optional. Behind-the-scenes posts. Skip for v1 if time is short |
| Newsletter | Form in the Hearth. Provider TBD (Buttondown or MailerLite free tiers) |

## 6. Stack

- **Astro 5**, static output. Zero JS by default; islands only for the shelf and embers.
- **Content from the pipeline.** `scripts/sync-catalog.mjs` reads
  `../ebook-pipeline/templates/workbooks/*.yaml` and `output/<run>/previews/*.png`, writes
  `src/content/products/*.json` and optimized WebP into `public/catalog/`. The pipeline stays the
  single source of truth; the site never hand-copies a product description.
- Fonts from Google Fonts, self-hosted later via `@fontsource` for speed.
- Images via Astro `<Image>` (sharp) → AVIF/WebP.
- Analytics: Plausible (self-hosted on the same VM) or none for v1.

## 7. Oracle Cloud deployment

Pay-as-you-go accounts keep the Always Free allowances, so v1 should cost $0/month.

| Piece | Choice | Notes |
|---|---|---|
| Compute | `VM.Standard.A1.Flex`, 2 OCPU / 12 GB, Ubuntu 24.04 minimal | Free up to 4 OCPU / 24 GB. A1 capacity is sometimes "out of host capacity" in popular ADs; retry or pick another AD. |
| Web server | **Caddy 2** | Automatic HTTPS, HTTP/3, one 6-line Caddyfile. Serves `/srv/www/oakandemberpress.com`. |
| Firewall | Open 80/443 in the VCN security list **and** in the OS (`iptables`/`nftables`) | Oracle's Ubuntu images ship with the OS firewall closed. Most "site won't load" reports are this. |
| Deploy | GitHub Actions: `npm ci && npm run build` → `rsync -az --delete dist/` over SSH | Secrets: `OCI_HOST`, `OCI_USER`, `OCI_SSH_KEY`. Deploys on push to `main`. |
| DNS | Registrar → Cloudflare (free) → OCI public IP | Cloudflare gives CDN, caching and DDoS cover for nothing. Set SSL mode "Full (strict)". |
| Backups | Git is the backup; the VM is disposable | Document the provision steps in `infra/` so a rebuild is 15 minutes. |
| Alt. | Object Storage static site + Cloudflare | Simpler but no custom-domain HTTPS without a CDN in front, and no room for Plausible or a future direct-sales API. The VM wins. |

`infra/` will hold: `cloud-init.yaml` (installs Caddy, creates the deploy user, opens ports),
`Caddyfile`, and `PROVISION.md` with the console clicks.

Domain: the strategy doc proposed `oakandemberpress.com`. Availability not checked from here.

## 8. Build plan

| Milestone | Scope | Done when |
|---|---|---|
| M0 | This brief approved, direction A confirmed | Owner reply |
| M1 | Astro scaffold, tokens, fonts, foil hero, debossed type, ridge rule, light/dark | Home renders, Lighthouse ≥ 95 |
| M2 | `sync-catalog` script, Shelf component, product pages for all 8 binders | Every binder has a page with real previews and an Etsy link |
| M3 | Hearth band + embers, newsletter form, About, Crew holding page | Full v1 content |
| M4 | OCI VM, Caddy, GitHub Actions deploy, DNS, HTTPS | Live on the domain |
| M5 | OG images, sitemap, structured data (Product), Plausible, perf pass | Shareable links look right on Pinterest/Instagram |

## 9. Open questions for the owner

1. Direction A confirmed, or do you want B's dark mood site-wide?
2. Domain: `oakandemberpress.com`, or is one already registered?
3. Etsy shop URL (for Buy buttons) and whether direct sales are a v1 or v2 goal.
4. Newsletter provider preference, or none for launch.
5. Should the Crew live here (`/crew/`) or stay a separate site?
6. Is `ebook-pipeline` meant to be checked out beside this repo on the build machine, or should
   the catalog JSON be committed here? (Committing is simpler for CI; I'd start there.)
