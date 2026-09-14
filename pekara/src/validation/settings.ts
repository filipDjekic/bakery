import { z } from 'zod';

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
