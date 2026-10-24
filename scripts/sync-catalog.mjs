#!/usr/bin/env node
// Reads the binder specs from the ebook-pipeline repo and writes one JSON per product
// into src/content/products/. Gallery cards, when present in the pipeline's output/,
// are copied to public/catalog/<slug>/. The pipeline stays the single source of truth.
//
//   node scripts/sync-catalog.mjs [--pipeline ../ebook-pipeline]
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { parse } from 'yaml';

const args = process.argv.slice(2);
const pipeline = resolve(args[args.indexOf('--pipeline') + 1] || process.env.PIPELINE_DIR || '../ebook-pipeline');
const specsDir = join(pipeline, 'templates', 'workbooks');
const outDir = resolve('src/content/products');
const publicDir = resolve('public/catalog');

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

if (!(await exists(specsDir))) {
  console.error(`sync-catalog: no specs at ${specsDir}. Pass --pipeline <path> or set PIPELINE_DIR.`);
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const files = (await readdir(specsDir)).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
let written = 0;
for (const f of files) {
  const spec = parse(await readFile(join(specsDir, f), 'utf8'));
  const slug = (spec.product || basename(f).replace(/\.ya?ml$/, '')).toLowerCase();
  const sections = Array.isArray(spec.sections) ? spec.sections.length : 0;

  // Gallery cards from the most recent packaged run for this product, if the output exists locally.
  const gallery = [];
  const outRoot = join(pipeline, 'output');
  if (await exists(outRoot)) {
    const runs = (await readdir(outRoot)).filter(r => r.includes(slug)).sort().reverse();
    for (const run of runs) {
      const prev = join(outRoot, run, 'previews');
      if (!(await exists(prev))) continue;
      const cards = (await readdir(prev)).filter(c => /\.(png|jpe?g|webp)$/i.test(c)).sort();
      if (!cards.length) continue;
      await mkdir(join(publicDir, slug), { recursive: true });
      for (const c of cards) { await copyFile(join(prev, c), join(publicDir, slug, c)); gallery.push(`/catalog/${slug}/${c}`); }
      break;
    }
  }

  const product = {
    slug,
    line: 'binders',
    title: String(spec.title || slug),
    subtitle: String(spec.subtitle || ''),
    description: String(spec.description || '').trim(),
    color: String(spec.cover?.color || '#2E3F55'),
    previews: Array.isArray(spec.previews) ? spec.previews.map(String) : [],
    sections,
    sizes: ['Letter', 'A4'],
    editions: ['Standard', 'Large print'],
    tags: Array.isArray(spec.seo?.tags) ? spec.seo.tags.map(String) : [],
    gallery,
    sourceSpec: `templates/workbooks/${f}`,
  };
  await writeFile(join(outDir, `${slug}.json`), JSON.stringify(product, null, 2) + '\n');
  written++;
}
console.log(JSON.stringify({ ok: true, products: written, gallery_dirs: (await exists(publicDir)) ? (await readdir(publicDir)).length : 0 }));
