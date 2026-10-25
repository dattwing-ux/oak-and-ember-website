#!/usr/bin/env node
// Reads the binder specs from the ebook-pipeline repo and writes one JSON per product
// into src/content/products/. Gallery cards come from the newest finished pipeline run of
// each spec (state/runs/*/run.json) and are copied to public/catalog/<slug>/ as WebP.
// The pipeline stays the single source of truth.
//
//   node scripts/sync-catalog.mjs [--pipeline <path>]
// Without --pipeline or PIPELINE_DIR it uses the first sibling checkout that has specs:
// ../ebook-pipeline, then ../ebook-pipeline-local (the owner's E: drive layout).
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';

const SIBLING_PIPELINES = ['../ebook-pipeline', '../ebook-pipeline-local'];
const args = process.argv.slice(2);
const flag = args.indexOf('--pipeline');
const given = (flag >= 0 && args[flag + 1]) || process.env.PIPELINE_DIR;
let pipeline = given ? resolve(given) : null;
for (const p of given ? [] : SIBLING_PIPELINES) {
  if (await exists(join(resolve(p), 'templates', 'workbooks'))) { pipeline = resolve(p); break; }
}
pipeline ??= resolve(SIBLING_PIPELINES[0]);
const specsDir = join(pipeline, 'templates', 'workbooks');
const bundlesDir = join(pipeline, 'templates', 'bundles');
const outDir = resolve('src/content/products');
const publicDir = resolve('public/catalog');
const FINISHED = new Set(['packaged', 'previewed']);
const CARD_RE = /^\d{2}-.+\.(png|jpe?g|webp)$/i;   // the numbered Etsy cards, not the raw page renders
const CARD_WIDTH = 1600;

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

// Newest finished run built from a spec ("spec" in run.json; run IDs start with a timestamp).
async function latestRun(specName) {
  const runsDir = join(pipeline, 'state', 'runs');
  if (!(await exists(runsDir))) return null;
  let best = null;
  for (const id of await readdir(runsDir)) {
    const file = join(runsDir, id, 'run.json');
    if (!(await exists(file))) continue;
    const run = JSON.parse(await readFile(file, 'utf8'));
    if (run.spec === specName && FINISHED.has(run.status) && (!best || run.run_id > best.run_id)) best = run;
  }
  return best;
}

// Copy the numbered cards as WebP. Without local previews (e.g. a cloud checkout), keep the
// gallery already recorded for the product so a sync never wipes published images.
async function syncGallery(prevDir, slug) {
  if (!prevDir || !(await exists(prevDir))) {
    const current = join(outDir, `${slug}.json`);
    return (await exists(current)) ? JSON.parse(await readFile(current, 'utf8')).gallery || [] : [];
  }
  const cards = (await readdir(prevDir)).filter(c => CARD_RE.test(c)).sort();
  const dest = join(publicDir, slug);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  const gallery = [];
  for (const c of cards) {
    const name = c.replace(/\.(png|jpe?g|webp)$/i, '.webp');
    await sharp(join(prevDir, c)).resize({ width: CARD_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 }).toFile(join(dest, name));
    gallery.push(`/catalog/${slug}/${name}`);
  }
  return gallery;
}

// Spec description, else the intro's first paragraph without its "Welcome to …" sentence.
function describe(spec) {
  if (spec.description) return String(spec.description).trim();
  const intro = Array.isArray(spec.intro) ? String(spec.intro[0] || '') : '';
  return intro.replace(/^Welcome to [^.]*\.\s*/, '').trim() || String(spec.subtitle || '');
}

if (!(await exists(specsDir))) {
  console.error(`sync-catalog: no specs at ${specsDir}. Pass --pipeline <path> or set PIPELINE_DIR.`);
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const files = (await readdir(specsDir)).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
const synced = new Set();   // slugs written this run
for (const f of files) {
  const spec = parse(await readFile(join(specsDir, f), 'utf8'));
  const specName = basename(f).replace(/\.ya?ml$/, '');
  const slug = (spec.product || specName).toLowerCase();
  const run = await latestRun(specName);
  const gallery = await syncGallery(run && join(pipeline, 'output', run.run_id, 'previews'), slug);

  const product = {
    slug,
    line: 'binders',
    title: String(spec.title || slug),
    subtitle: String(spec.subtitle || ''),
    description: describe(spec),
    color: String(spec.cover?.color || '#2E3F55'),
    previews: Array.isArray(spec.previews) ? spec.previews.map(String) : [],
    sections: Array.isArray(spec.sections) ? spec.sections.length : 0,
    sizes: ['Letter', 'A4'],
    editions: ['Standard', 'Large print'],
    tags: Array.isArray(spec.seo?.tags) ? spec.seo.tags.map(String) : [],
    gallery,
    kind: 'binder',
    includes: [],
    sourceSpec: `templates/workbooks/${f}`,
  };
  await writeFile(join(outDir, `${slug}.json`), JSON.stringify(product, null, 2) + '\n');
  synced.add(slug);
}

// Bundles: several finished binders sold as one listing (steps/bundle.py). Gallery from output/bundles/<product>/previews.
if (await exists(bundlesDir)) {
  for (const f of (await readdir(bundlesDir)).filter(f => /\.ya?ml$/.test(f))) {
    const spec = parse(await readFile(join(bundlesDir, f), 'utf8'));
    const slug = String(spec.product || basename(f).replace(/\.ya?ml$/, '')).toLowerCase();
    const gallery = await syncGallery(join(pipeline, 'output', 'bundles', slug, 'previews'), slug);
    const product = {
      slug, line: 'binders', kind: 'bundle',
      title: String(spec.title || slug), subtitle: String(spec.subtitle || ''), description: describe(spec),
      color: String(spec.cover?.color || '#8F7442'),
      previews: [], sections: 0, sizes: ['Letter', 'A4'], editions: ['Standard', 'Large print'],
      tags: Array.isArray(spec.seo?.tags) ? spec.seo.tags.map(String) : [],
      gallery, includes: Array.isArray(spec.specs) ? spec.specs.map(String) : [],
      sourceSpec: `templates/bundles/${f}`,
    };
    await writeFile(join(outDir, `${slug}.json`), JSON.stringify(product, null, 2) + '\n');
    synced.add(slug);
  }
}
// Drop products (and their cards) that no spec produces any more, e.g. after a spec rename.
const pruned = [];
for (const f of (await readdir(outDir)).filter(f => f.endsWith('.json'))) {
  if (!synced.has(f.replace(/\.json$/, ''))) { await rm(join(outDir, f)); pruned.push(f); }
}
if (await exists(publicDir)) {
  for (const d of await readdir(publicDir)) {
    if (!synced.has(d)) await rm(join(publicDir, d), { recursive: true, force: true });
  }
}
console.log(JSON.stringify({ ok: true, products: synced.size, pruned, gallery_dirs: (await exists(publicDir)) ? (await readdir(publicDir)).length : 0 }));
