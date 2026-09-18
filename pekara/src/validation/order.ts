import { z } from 'zod';

const status = z.enum([
  'NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'COMPLETED', 'CANCELLED',
]);

export const orderStatusChangeSchema = z
  .object({
    orderId: z.string().uuid(),
    currentStatus: status,
    targetStatus: status,
    cancellationReason: z.string().trim().max(300).optional(),
  })
  .refine(
    (value) =>
      value.targetStatus !== 'CANCELLED' ||
      Boolean(value.cancellationReason?.length),
    { path: ['cancellationReason'], message: 'Razlog otkazivanja je obavezan.' },
  );
