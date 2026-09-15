import { z } from 'zod';

import { CART_LIMITS, CHECKOUT_LIMITS } from '../config/limits.ts';
import { normalizeCustomerPhone } from '../lib/phone.ts';

const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .string()
    .trim()
    .email('Unesite ispravnu email adresu.')
    .max(
      CHECKOUT_LIMITS.customerEmail,
      `Email može imati najviše ${CHECKOUT_LIMITS.customerEmail} karaktera.`,
    )
    .optional(),
);

const optionalNoteSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .string()
    .trim()
    .max(
      CHECKOUT_LIMITS.note,
      `Napomena može imati najviše ${CHECKOUT_LIMITS.note} karaktera.`,
    )
    .optional(),
);

const customerNameSchema = z
  .string()
  .trim()
  .min(1, 'Ime i prezime su obavezni.')
  .max(
    CHECKOUT_LIMITS.customerName,
    `Ime može imati najviše ${CHECKOUT_LIMITS.customerName} karaktera.`,
  );

const customerPhoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const normalizedPhone = normalizeCustomerPhone(value);

    if (!normalizedPhone) {
      context.addIssue({
        code: 'custom',
        message: 'Unesite ispravan broj telefona.',
      });
      return z.NEVER;
    }

    if (normalizedPhone.length > CHECKOUT_LIMITS.customerPhone) {
      context.addIssue({
        code: 'too_big',
        maximum: CHECKOUT_LIMITS.customerPhone,
        origin: 'string',
        inclusive: true,
        message: 'Broj telefona je predugačak.',
      });
      return z.NEVER;
    }

    return normalizedPhone;
  });

const pickupAtSchema = z
  .string()
  .datetime({
    offset: true,
    message: 'Izaberite ispravan termin preuzimanja.',
  });

const pickupDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Izaberite datum preuzimanja.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  }, 'Izaberite ispravan datum preuzimanja.');

export const checkoutItemSchema = z
  .object({
    productId: z.string().uuid('ID proizvoda mora biti UUID.'),
    quantity: z
      .number()
      .int('Količina mora biti ceo broj.')
      .min(CART_LIMITS.minItemQuantity)
      .max(CART_LIMITS.maxItemQuantity),
  })
  .strict();

export const checkoutRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid('Idempotency key mora biti UUID.'),
    customerName: customerNameSchema,
    customerPhone: customerPhoneSchema,
    customerEmail: optionalEmailSchema,
    note: optionalNoteSchema,
    pickupAt: pickupAtSchema,
    items: z
      .array(checkoutItemSchema)
      .min(1, 'Korpa ne može biti prazna.')
      .max(
        CART_LIMITS.maxDistinctItems,
        `Korpa može imati najviše ${CART_LIMITS.maxDistinctItems} različitih proizvoda.`,
      ),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const seenProductIds = new Set<string>();
    let totalQuantity = 0;

    items.forEach((item, index) => {
      if (seenProductIds.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'Isti proizvod ne može biti dodat više puta.',
          path: ['items', index, 'productId'],
        });
      }

      seenProductIds.add(item.productId);
      totalQuantity += item.quantity;
    });

    if (totalQuantity > CART_LIMITS.maxTotalQuantity) {
      context.addIssue({
        code: 'custom',
        message: `Ukupna količina može biti najviše ${CART_LIMITS.maxTotalQuantity}.`,
        path: ['items'],
      });
    }
  });

export const checkoutFormSchema = z.object({
  customerName: customerNameSchema,
  customerPhone: customerPhoneSchema,
  customerEmail: optionalEmailSchema,
  note: optionalNoteSchema,
  pickupDate: pickupDateSchema,
  pickupAt: pickupAtSchema,
});

export type CheckoutRequestInput = z.input<typeof checkoutRequestSchema>;
export type CheckoutRequest = z.output<typeof checkoutRequestSchema>;
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutFormValues = z.output<typeof checkoutFormSchema>;
