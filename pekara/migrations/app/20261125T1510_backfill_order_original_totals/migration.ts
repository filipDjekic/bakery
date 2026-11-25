#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0ac919db64d2b4147a64590cff79641695f03357dc43d5870b7191ee90813647/contract';
import endContract from '../../snapshots/0ac919db64d2b4147a64590cff79641695f03357dc43d5870b7191ee90813647/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/44f18c87223ebfb1181b58783833a78f77938664b645befee14662de5d0de866/contract';
import startContract from '../../snapshots/44f18c87223ebfb1181b58783833a78f77938664b645befee14662de5d0de866/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_discount_integrity_22b58ef9',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_snapshot_presence_5c416ba4',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_discount_integrity_252856c0',
        expression:
          '("lateDiscountAt" IS NULL AND "discountMinor" = 0 AND ("originalTotalMinor" IS NULL OR "originalTotalMinor" = "totalMinor")) OR ("lateDiscountAt" IS NOT NULL AND "originalTotalMinor" IS NOT NULL AND "originalTotalMinor" >= 0 AND "discountMinor" = (("originalTotalMinor"::bigint * 15 + 50) / 100) AND "totalMinor" = "originalTotalMinor" - "discountMinor")',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_snapshot_presence_03507d08',
        expression:
          '("lateDiscountAt" IS NULL OR "originalTotalMinor" IS NOT NULL) AND ("status" <> \'LATE\' OR "lateDiscountAt" IS NOT NULL)',
      }),
      // Only seed previously undiscounted orders. Applied discounts, totals,
      // timestamps and OrderItem snapshots are deliberately untouched.
      rawSql({
        id: 'data.order.backfillOriginalTotalMinor',
        label: 'Backfill original totals for existing undiscounted orders',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'order' },
        },
        precheck: [],
        execute: [
          {
            description:
              'Initialize missing original totals without applying a discount',
            sql: 'UPDATE "public"."order" SET "originalTotalMinor" = "totalMinor" WHERE "originalTotalMinor" IS NULL AND "discountMinor" = 0 AND "lateDiscountAt" IS NULL',
          },
        ],
        postcheck: [
          {
            description:
              'Verify all existing undiscounted orders have original totals',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."order" WHERE "originalTotalMinor" IS NULL AND "discountMinor" = 0 AND "lateDiscountAt" IS NULL) AS "result"',
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
