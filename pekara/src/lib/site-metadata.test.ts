import { describe, expect, it } from 'vitest';

import { buildRootMetadata } from './site-metadata';

describe('site metadata', () => {
  it('uses BakerySettings branding and canonical base URL', () => {
    const metadata = buildRootMetadata(
      { bakeryName: 'Mrvica', address: 'Glavna 1' },
      new URL('https://pekara.example'),
    );
    expect(metadata.applicationName).toBe('Mrvica');
    expect(metadata.title).toEqual({
      default: 'Mrvica',
      template: '%s | Mrvica',
    });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({ siteName: 'Mrvica' }),
    );
    expect(String(metadata.metadataBase)).toBe('https://pekara.example/');
  });

  it('has a safe fallback when settings are unavailable', () => {
    const metadata = buildRootMetadata(null, new URL('https://example.com'));
    expect(metadata.applicationName).toBe('Pekara');
    expect(metadata.description).toBe(
      'Online poručivanje svežih pekarskih proizvoda.',
    );
  });
});
