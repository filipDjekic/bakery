#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0ac919db64d2b4147a64590cff79641695f03357dc43d5870b7191ee90813647/contract';
import startContract from '../../snapshots/0ac919db64d2b4147a64590cff79641695f03357dc43d5870b7191ee90813647/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e0c3715567957912b2565406ef28a4d1da1fe6297ceb30450da2b01b4e8a33c4/contract';
import endContract from '../../snapshots/e0c3715567957912b2565406ef28a4d1da1fe6297ceb30450da2b01b4e8a33c4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('readyAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('unitLabel', 'character varying(40)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderNotificationDelivery',
        column: col('payload', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      rawSql({
        id: 'data.order.restorePreparationStage',
        label: 'Restore preparation stages and readiness audit from history',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'order' },
        },
        precheck: [],
        execute: [
          {
            description:
              'Recover readiness timestamps only from actual READY history',
            sql: `UPDATE "public"."order" o SET "readyAt" = h.ready FROM (SELECT "orderId", MIN("createdAt") AS ready FROM "public"."orderStatusHistory" WHERE "toStatus" = 'READY' GROUP BY "orderId") h WHERE o.id = h."orderId" AND o."readyAt" IS NULL`,
          },
          {
            description:
              'Audit and restore active LATE rows; missing history conservatively resumes at NEW',
            sql: `WITH stages AS (SELECT o.id, COALESCE((SELECT h."fromStatus" FROM "public"."orderStatusHistory" h WHERE h."orderId" = o.id AND h."toStatus" = 'LATE' AND h."fromStatus" IN ('NEW','ACCEPTED','IN_PREPARATION','READY') ORDER BY h."createdAt" DESC, h.id DESC LIMIT 1), 'NEW') AS stage, GREATEST(o."updatedAt", (SELECT MAX(h."createdAt") FROM "public"."orderStatusHistory" h WHERE h."orderId" = o.id)) + interval '1 millisecond' AS at FROM "public"."order" o WHERE o.status = 'LATE'), audit AS (INSERT INTO "public"."orderStatusHistory" (id,"orderId","fromStatus","toStatus","changedByUserId",reason,"createdAt") SELECT gen_random_uuid(), id, 'LATE', stage, NULL, 'Migracija: vraćen prethodni tok pripreme; kašnjenje i popust ostaju zabeleženi.', at FROM stages) UPDATE "public"."order" o SET status = s.stage FROM stages s WHERE o.id = s.id`,
          },
          {
            description:
              'Expose legacy deliveries whose original provider payload is unavailable',
            sql: `UPDATE "public"."orderNotificationDelivery" SET status = 'FAILED', "leaseUntil" = NULL, "lastErrorCode" = 'EMAIL_ORIGINAL_PAYLOAD_UNAVAILABLE' WHERE payload IS NULL AND status IN ('PENDING','FAILED','SENDING')`,
          },
        ],
        postcheck: [
          {
            description: 'No operational LATE statuses remain',
            sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."order" WHERE status = 'LATE') AS result`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
