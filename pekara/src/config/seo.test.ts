import assert from 'node:assert/strict';
import { test } from 'vitest';

import robots from '../app/robots.ts';
import { buildSitemap } from '../app/sitemap.ts';

test('robots allows public pages and excludes private transactional routes', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  assert.equal(rules?.allow, '/');
  assert.deepEqual(rules?.disallow, [
    '/admin/',
    '/checkout',
    '/korpa',
    '/porudzbina/',
  ]);
  assert.match(String(result.sitemap), /\/sitemap\.xml$/);
});

test('sitemap contains only indexable public routes and active product input', () => {
  const entries = buildSitemap(new URL('https://pekara.example'), [
    { slug: 'sveza-kifla', updatedAt: new Date('2026-09-18T00:00:00Z') },
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.url),
    [
      'https://pekara.example/',
      'https://pekara.example/proizvodi',
      'https://pekara.example/proizvodi/sveza-kifla',
    ],
  );
  assert.equal(entries.some((entry) => /admin|checkout|porudzbina/.test(entry.url)), false);
});
