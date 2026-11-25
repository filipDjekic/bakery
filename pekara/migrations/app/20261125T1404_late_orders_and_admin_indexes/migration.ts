#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04763c267ada033da37356af8f0e18098661a31fe2e411df5f8e028caaf3a118/contract';
import endContract from '../../snapshots/04763c267ada033da37356af8f0e18098661a31fe2e411df5f8e028caaf3a118/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4f67248e1dcb99d56a8be933c0ef5d8498a6308a317f3f6fc8dfd301b1076792/contract';
import startContract from '../../snapshots/4f67248e1dcb99d56a8be933c0ef5d8498a6308a317f3f6fc8dfd301b1076792/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'category',
        index: 'category_isActive_sortOrder_idx_43c1fe34',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_status_check_ca95f5cd',
      }),
      this.dropIndex({ schema: 'public', table: 'order', index: 'order_createdAt_idx_9575dbd7' }),
      this.dropIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_createdAt_idx_58610442',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'orderStatusHistory',
        constraint: 'orderStatusHistory_fromStatus_check_860a7e10',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'orderStatusHistory',
        constraint: 'orderStatusHistory_toStatus_check_199b8070',
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('discountMinor', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('lateDiscountAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('originalTotalMinor', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_discount_integrity_22b58ef9',
        expression:
          '("originalTotalMinor" IS NULL AND "discountMinor" = 0 AND "lateDiscountAt" IS NULL) OR ("originalTotalMinor" >= 0 AND "lateDiscountAt" IS NOT NULL AND "discountMinor" = (("originalTotalMinor"::bigint * 15 + 50) / 100) AND "totalMinor" = "originalTotalMinor" - "discountMinor")',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_status_check_c7ed790c',
        expression:
          "\"status\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'LATE', 'COMPLETED', 'CANCELLED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orderStatusHistory',
        constraint: 'orderStatusHistory_fromStatus_check_da99fd3c',
        expression:
          "\"fromStatus\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'LATE', 'COMPLETED', 'CANCELLED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orderStatusHistory',
        constraint: 'orderStatusHistory_toStatus_check_dbbe39c9',
        expression:
          "\"toStatus\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'LATE', 'COMPLETED', 'CANCELLED')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'category',
        index: 'category_isActive_sortOrder_name_id_idx_a42675e4',
        columns: ['isActive', 'sortOrder', 'name', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_createdAt_id_idx_3855cff1',
        columns: ['createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_createdAt_id_idx_ffb42ad8',
        columns: ['status', 'createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_pickupAt_createdAt_id_idx_541b1116',
        columns: ['status', 'pickupAt', 'createdAt', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_updatedAt_id_idx_88868a1d',
        columns: ['updatedAt', 'id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
