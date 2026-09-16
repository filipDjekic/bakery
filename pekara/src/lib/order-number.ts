import { randomInt } from 'node:crypto';

import { DateTime } from 'luxon';

const TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomToken(length: number): string {
  return Array.from(
    { length },
    () => TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)],
  ).join('');
}

export function generateOrderNumber(
  now: DateTime,
  bakeryTimezone: string,
): string {
  if (!now.isValid) {
    throw new Error('Cannot generate an order number from an invalid time.');
  }

  const localDate = now.setZone(bakeryTimezone);

  if (!localDate.isValid) {
    throw new Error('Cannot generate an order number for an invalid timezone.');
  }

  return `PK-${localDate.toFormat('yyLLdd')}-${randomToken(6)}`;
}
