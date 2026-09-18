import 'server-only';

import { db } from '../../prisma/db.ts';
import { requireStaff } from '../auth/authorization.ts';

export async function getAdminOrder(id: string) {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return db.orm.public.Order.include('items').where({ id }).first();
}
