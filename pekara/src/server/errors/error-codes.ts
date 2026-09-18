export const APP_ERROR_CODES = [
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_RESOURCE',
  'PRODUCT_UNAVAILABLE',
  'PRICE_CHANGED',
  'INVALID_PICKUP_SLOT',
  'ORDERS_DISABLED',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'DATABASE_ERROR',
  'INTERNAL_ERROR',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const DEFAULT_ERROR_DEFINITIONS: Record<
  AppErrorCode,
  { status: number; safeMessage: string }
> = {
  VALIDATION_ERROR: {
    status: 400,
    safeMessage: 'Podaci zahteva nisu validni.',
  },
  AUTHENTICATION_REQUIRED: { status: 401, safeMessage: 'Prijava je obavezna.' },
  AUTHORIZATION_DENIED: {
    status: 403,
    safeMessage: 'Nemate dozvolu za ovu operaciju.',
  },
  NOT_FOUND: { status: 404, safeMessage: 'Traženi resurs ne postoji.' },
  CONFLICT: {
    status: 409,
    safeMessage: 'Zahtev je u konfliktu sa trenutnim stanjem.',
  },
  DUPLICATE_RESOURCE: {
    status: 409,
    safeMessage: 'Resurs sa tim podacima već postoji.',
  },
  PRODUCT_UNAVAILABLE: {
    status: 409,
    safeMessage: 'Jedan ili više proizvoda više nisu dostupni.',
  },
  PRICE_CHANGED: {
    status: 409,
    safeMessage: 'Cena jednog ili više proizvoda je promenjena.',
  },
  INVALID_PICKUP_SLOT: {
    status: 409,
    safeMessage: 'Izabrani termin više nije dostupan.',
  },
  ORDERS_DISABLED: {
    status: 409,
    safeMessage: 'Primanje porudžbina je trenutno isključeno.',
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    safeMessage: 'Isti ključ zahteva je već iskorišćen sa drugim podacima.',
  },
  RATE_LIMITED: {
    status: 429,
    safeMessage: 'Previše pokušaja. Pokušajte ponovo kasnije.',
  },
  DATABASE_ERROR: {
    status: 503,
    safeMessage: 'Servis trenutno nije dostupan. Pokušajte ponovo.',
  },
  INTERNAL_ERROR: {
    status: 500,
    safeMessage: 'Došlo je do interne greške. Pokušajte ponovo.',
  },
};
