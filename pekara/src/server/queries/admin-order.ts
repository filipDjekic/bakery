import 'server-only';
import { z } from 'zod';
import { db } from '../../prisma/db.ts';
import { authPrisma } from '../auth/prisma.ts';
import { requireStaff } from '../auth/authorization.ts';
export async function getAdminOrder(
  id: string,
  authorize: () => Promise<unknown> = requireStaff,
) {
  await authorize();
  if (!z.string().uuid().safeParse(id).success) return null;
  const order = await db.orm.public.Order.include('items')
    .include('statusHistory', (history) =>
      history.orderBy((h) => h.createdAt.asc()).orderBy((h) => h.id.asc()),
    )
    .include('notifications')
    .where({ id })
    .first();
  if (!order) return null;
  const actorIds = [
    ...new Set(
      order.statusHistory.flatMap((entry) =>
        entry.changedByUserId ? [entry.changedByUserId] : [],
      ),
    ),
  ];
  const actors = actorIds.length
    ? await authPrisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(actors.map((actor) => [actor.id, actor.name]));
  return {
    ...order,
    statusHistory: order.statusHistory.map((entry) => ({
      ...entry,
      actorName: entry.changedByUserId
        ? (names.get(entry.changedByUserId) ?? 'Obrisan zaposleni')
        : 'Kupac / sistem',
    })),
  };
}
