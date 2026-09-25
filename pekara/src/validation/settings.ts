import { z } from 'zod';

export const bakeryProfileSchema = z.object({
  bakeryName: z.string().trim().min(1, 'Naziv je obavezan.').max(120),
  phone: z.string().trim().min(3, 'Telefon je obavezan.').max(30),
  address: z.string().trim().min(1, 'Adresa je obavezna.').max(250),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export const notificationSettingsSchema = z.object({
  notificationEmail: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Email nije validan.',
    )
    .transform((value) => value || null),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export const orderSettingsSchema = z.object({
  orderAcceptingEnabled: z.boolean(),
  minimumPreparationMinutes: z.coerce.number().int().min(0).max(240),
  maximumAdvanceDays: z.coerce.number().int().min(0).max(30),
  pickupSlotMinutes: z.coerce
    .number()
    .pipe(
      z.union([
        z.literal(5),
        z.literal(10),
        z.literal(15),
        z.literal(20),
        z.literal(30),
        z.literal(60),
      ]),
    ),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export const businessHoursIntervalSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    openMinute: z.number().int().min(0).max(1439),
    closeMinute: z.number().int().min(1).max(1440),
  })
  .refine(({ openMinute, closeMinute }) => openMinute < closeMinute, {
    message: 'closeMinute mora biti veći od openMinute',
    path: ['closeMinute'],
  });

export const workingHoursSchema = z
  .array(businessHoursIntervalSchema)
  .max(35, 'Previše intervala radnog vremena.')
  .superRefine((intervals, context) => {
    for (let weekday = 1; weekday <= 7; weekday += 1) {
      const day = intervals
        .filter((interval) => interval.weekday === weekday)
        .sort((left, right) => left.openMinute - right.openMinute);
      for (let index = 1; index < day.length; index += 1) {
        if (day[index]!.openMinute < day[index - 1]!.closeMinute) {
          context.addIssue({
            code: 'custom',
            message: 'Intervali istog dana ne smeju da se preklapaju.',
            path: [intervals.indexOf(day[index]!)],
          });
        }
      }
    }
  });

export type BakeryProfileInput = z.input<typeof bakeryProfileSchema>;
export type NotificationSettingsInput = z.input<
  typeof notificationSettingsSchema
>;
export type OrderSettingsInput = z.input<typeof orderSettingsSchema>;
export type WorkingHoursInput = z.input<typeof workingHoursSchema>;
