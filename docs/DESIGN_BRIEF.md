# Oak & Ember Press — Website Design Brief

Status: revision 2 (phone-first, direction-neutral) · 2026-10-24
Repo: `dattwing-ux/oak-and-ember-website` · Host: Oracle Cloud (pay-as-you-go account, Always Free tier)

## 1. What the site is for

Oak & Ember Press sells printable binders, workbooks, planners and (soon) fiction on Etsy, with
an animated kids' series on the side and AI workflows / pipeline tooling as the next line. The
pipeline in `ebook-pipeline` produces every product and its gallery images automatically.

The site's one job: make a stranger who lands from Etsy, Pinterest or Instagram believe this
is a real press with a point of view, then send them to the product. Secondary jobs: collect
emails, give the brand a home that isn't a marketplace, and later sell direct.

## 2. Two facts that decide the design

1. **Most visitors are on a phone.** Etsy, Pinterest and Instagram referral traffic runs about
   70–80% mobile. The phone is the primary canvas. Desktop is the wider version of the phone
   layout, never the other way round.
2. **The brand must not be tied to one product category or one place.** Today it is binders and
   planners; next year it may be fiction, kids' animation and AI workflow products. The identity
   has to hold all of them without a redesign. So the identity is the **ember**, not a shelf, a
   landscape or a genre.

## 3. Brand facts the design honors

| Element | Value |
|---|---|
| Palette | Deep Forest `#0F2C23` · Warm Oak `#4A3728` · Ember Gold `#C9A961` · Soft Cream `#FDF8F0` · Muted Burgundy `#6B2D3C` |
| Logo | Gold oak leaf with a single flame, serif wordmark. Measured gold: `#C8A96E`. |
| Tagline | "Rooted in strength. Ignited by story." |
| Voice | Warm but restrained. Concrete before abstract. Short sentences land. No filler. |
| Audience | 28–55, buys beautiful useful objects, journaling, homemaking, makers, readers. |
| Lines | Binders (8 live), Planners (live), Stories (first title in work), Studio = AI workflows and pipeline templates (next), Crew = kids' series (link out). |

## 4. The direction: One Spark

The ember is a living particle field. On the landing page it **is** the brand mark: two thousand
embers hold the shape of the leaf and flame. As the thumb scrolls, the embers scatter and re-form
into each product line in turn: a binder, a planner page, an open book, a workflow graph. Each
stage has one short caption at the bottom of the screen, where the thumb is. The last stage
carries the call to action into the shop.

Why it is high impact and not a trick:
- **It is the system, not a hero.** The ember layer is a persistent canvas. Astro view
  transitions keep it alive between pages, so tapping a product makes the embers gust toward it
  instead of a white flash. The landing experience continues through navigation.
- **Every page takes a hue.** Each line and each product has a color (binders already carry
  `cover.color` in their YAML). The ambient embers and the nav highlight tint to it, so a visitor
  always knows which part of the house they are in.
- **A new line costs one color and one particle shape.** AI workflows, a kids' series, a cookbook:
  anything joins by defining a shape the embers can form. Nothing in the identity says "paper
  products" or names a region.
- **Thumb-reach navigation.** A bottom pill nav with the same four doors on every page: Home,
  Shop, Stories, Studio. Desktop gets the same pill, wider. No hamburger.

### Signature moments
1. Load: the mark is already formed (no empty first frame). Embers breathe. Touch stirs them.
2. Scroll: five stages, each one gesture. Progress dots on the right edge.
3. Tap a nav door or a product: embers gust and re-tint. Content slides under the same sky.
4. Product page: the product's own gallery card (from pipeline step 07) sits in the ember field,
   tinted with its cover color. One primary button: Buy on Etsy.

### Type
- Display: **Cormorant Garamond** 500, italic for the one emphasized word. Closest living face to the wordmark.
- Body and UI: **Source Sans 3**. Reads well at 17px on a dark phone screen; one family keeps the payload small.

### Color
Single committed dark look: deep forest ground, cream ink, gold reserved for the mark, one
italic word per screen, and highlights. Line colors tint the embers, never the text.

### Motion
Everything is driven by scroll position or touch; nothing autoplays except the slow ember drift.
`prefers-reduced-motion` freezes the field at its formed state and swaps stages without the scatter.

### Performance budget (phone)
- Particle canvas: 1,400–1,900 points, pre-rendered sprite, additive blend, DPR capped at 2. Target 60 fps on a 2021 mid-range Android; fall back to 900 points if the first second averages under 45 fps.
- No framework JS on content pages. Islands only for the ember layer and the nav.
- Lighthouse mobile ≥ 90 performance on product pages.

## 5. Site map (v1)

| Route | Purpose |
|---|---|
| `/` | The five-stage ember scroller → lines row (swipe) → "it carries through" → newsletter |
| `/shop/` | All lines. Filter chips: Binders · Planners · Stories · Studio |
| `/shop/<slug>/` | Product: gallery card in the ember field, description and "what's inside" from YAML, page count, Letter/A4, Standard/Large-print, Buy on Etsy |
| `/stories/` | Fiction line. Holding page with a voice sample until the first title ships |
| `/studio/` | AI workflows and pipeline tooling. Holding page: what's coming, email capture |
| `/about/` | The press and how things are made (AI disclosure matches the listings) |
| `/crew/` | Doorway to the kids' series; its own site later |
| Newsletter | Form on the home page and in the footer. Provider TBD (Buttondown or MailerLite free tiers) |

## 6. Stack

- **Astro 5**, static output, view transitions on, ember canvas marked `transition:persist`.
- **Content from the pipeline.** `scripts/sync-catalog.mjs` reads
  `../ebook-pipeline/templates/workbooks/*.yaml` and `output/<run>/previews/*.png`, writes
  `src/content/products/*.json` and optimized WebP into `public/catalog/`. The pipeline stays the
  single source of truth; the site never hand-copies a product description.
- Fonts self-hosted via `@fontsource` (two families, subset to Latin).
- Images via Astro `<Image>` (sharp) → AVIF/WebP.
- Analytics: Plausible (self-hosted on the same VM) or none for v1.

## 7. Oracle Cloud deployment

Pay-as-you-go accounts keep the Always Free allowances, so v1 should cost $0/month.

| Piece | Choice | Notes |
|---|---|---|
| Compute | `VM.Standard.A1.Flex`, 2 OCPU / 12 GB, Ubuntu 24.04 minimal | Free up to 4 OCPU / 24 GB. A1 capacity is sometimes "out of host capacity"; retry or pick another AD. |
| Web server | **Caddy 2** | Automatic HTTPS, HTTP/3, a six-line Caddyfile. Serves `/srv/www/<domain>`. |
| Firewall | Open 80/443 in the VCN security list **and** in the OS (`iptables`/`nftables`) | Oracle's Ubuntu images ship with the OS firewall closed. Most "site won't load" reports are this. |
| Deploy | GitHub Actions: `npm ci && npm run build` → `rsync -az --delete dist/` over SSH | Secrets: `OCI_HOST`, `OCI_USER`, `OCI_SSH_KEY`. Deploys on push to `main`. |
| DNS | Registrar → Cloudflare (free) → OCI public IP | CDN, caching and DDoS cover for nothing. SSL mode "Full (strict)". |
| Backups | Git is the backup; the VM is disposable | `infra/` documents a 15-minute rebuild. |
| Alt. | Object Storage static site + Cloudflare | Simpler but no custom-domain HTTPS without a CDN in front, and no room for Plausible or a future direct-sales API. The VM wins. |

`infra/` will hold: `cloud-init.yaml` (installs Caddy, creates the deploy user, opens ports),
`Caddyfile`, and `PROVISION.md` with the console clicks.

Domain: the strategy doc proposed `oakandemberpress.com`. Availability not checked from here.

## 8. Build plan

| Milestone | Scope | Done when |
|---|---|---|
| M0 | Direction confirmed | Owner reply |
| M1 | Astro scaffold, tokens, fonts, ember layer as a persistent island, bottom nav, five-stage scroller | Home renders on a phone at 60 fps; Lighthouse ≥ 90 |
| M2 | `sync-catalog`, shop index, product pages for all 8 binders with real gallery cards | Every binder has a page with an Etsy link |
| M3 | Stories, Studio and About holding pages, newsletter form, hue-per-page | Full v1 content |
| M4 | OCI VM, Caddy, GitHub Actions deploy, DNS, HTTPS | Live on the domain |
| M5 | OG images, sitemap, Product structured data, Plausible, perf pass | Shared links look right on Pinterest/Instagram |

## 9. Open questions for the owner

1. Direction confirmed?
2. Domain: `oakandemberpress.com`, or something already registered?
3. Etsy shop URL (for Buy buttons) and whether direct sales are v1 or v2.
4. Newsletter provider preference, or none for launch.
5. What should Studio promise at launch: a waitlist only, or named products (workflow templates, the render stack)?
6. Should the catalog JSON be committed here (simplest for CI; my default) or should CI check out `ebook-pipeline` beside this repo?
