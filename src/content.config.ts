import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Products are generated from the ebook-pipeline specs by `npm run sync-catalog`.
// Edit the YAML in the pipeline, not these JSON files.
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products' }),
  schema: z.object({
    slug: z.string(),
    line: z.enum(['binders', 'planners', 'recipes', 'studio']),
    kind: z.enum(['binder', 'bundle']).default('binder'),
    includes: z.array(z.string()).default([]),   // bundle: slugs of the binders inside
    title: z.string(),
    subtitle: z.string().default(''),
    description: z.string().default(''),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    previews: z.array(z.string()).default([]),
    sections: z.number().int().nonnegative().default(0),
    sizes: z.array(z.string()).default(['Letter', 'A4']),
    editions: z.array(z.string()).default(['Standard', 'Large print']),
    tags: z.array(z.string()).default([]),
    etsyUrl: z.string().url().optional(),
    gallery: z.array(z.string()).default([]),
    sourceSpec: z.string(),
  }),
});

export const collections = { products };
