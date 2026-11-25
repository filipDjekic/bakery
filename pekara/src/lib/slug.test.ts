import { it, expect } from 'vitest';
import { normalizeSlug, slugCandidate } from './slug';
it('generates URL-safe slugs and bounded collision suffixes', () => {
  expect(normalizeSlug('  Burek  Sa Sirom  ')).toBe('burek-sa-sirom');
  expect(normalizeSlug('Čokoladni Kroasan')).toBe('cokoladni-kroasan');
  expect(normalizeSlug('Đevrek')).toBe('djevrek');
  expect(slugCandidate('a'.repeat(140), 140, 1)).toHaveLength(140);
  expect(slugCandidate('Kifla', 100, 2)).toBe('kifla-3');
});
