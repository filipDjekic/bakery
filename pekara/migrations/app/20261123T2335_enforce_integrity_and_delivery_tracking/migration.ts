#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/032270339dc0ddba45229dcb42caa092e494028d620952cc5ad4ec882b8ee0c9/contract';
import startContract from '../../snapshots/032270339dc0ddba45229dcb42caa092e494028d620952cc5ad4ec882b8ee0c9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4f67248e1dcb99d56a8be933c0ef5d8498a6308a317f3f6fc8dfd301b1076792/contract';
import endContract from '../../snapshots/4f67248e1dcb99d56a8be933c0ef5d8498a6308a317f3f6fc8dfd301b1076792/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'orderNotificationDelivery',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lastErrorCode', 'character varying(80)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('leaseUntil', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('orderId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('recipientType', 'character varying(16)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 16 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('notification_attempts_d5e9f5f8', 'attempts >= 0 AND attempts <= 5'),
          checkExpression(
            'notification_recipient_5f9d9902',
            "\"recipientType\" IN ('customer', 'bakery')",
          ),
          checkExpression(
            'orderNotificationDelivery_status_check_d698e316',
            "\"status\" IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('allergenInfo', 'character varying(500)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('unitLabel', 'character varying(40)', {
          codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 40 } },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'actionRateLimitBucket',
        constraint: 'rate_bucket_values_864f4317',
        expression: '"count" >= 0 AND "windowSeconds" > 0',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'bakerySettings',
        constraint: 'bakery_configuration_limits_9b095bc1',
        expression:
          '"minimumPreparationMinutes" BETWEEN 0 AND 240 AND "maximumAdvanceDays" BETWEEN 0 AND 30 AND "pickupSlotMinutes" IN (5, 10, 15, 20, 30, 60)',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'businessHours',
        constraint: 'business_hours_range_672bd15b',
        expression:
          '"weekday" BETWEEN 1 AND 7 AND "openMinute" >= 0 AND "closeMinute" <= 1440 AND "openMinute" < "closeMinute"',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_totals_nonnegative_f7be3536',
        expression: '"subtotalMinor" >= 0 AND "totalMinor" >= 0',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orderItem',
        constraint: 'order_item_subtotal_65d941d2',
        expression: '"subtotalMinor"::bigint = "unitPriceMinor"::bigint * "quantity"::bigint',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'orderItem',
        constraint: 'order_item_values_75e916ae',
        expression: '"unitPriceMinor" >= 0 AND "quantity" > 0 AND "subtotalMinor" >= 0',
      }),
      this.addUnique({
        schema: 'public',
        table: 'orderNotificationDelivery',
        constraint: 'orderNotificationDelivery_orderId_recipientType_key',
        columns: ['orderId', 'recipientType'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'product',
        constraint: 'product_image_dimensions_f23b31c6',
        expression:
          '("imageWidth" IS NULL OR "imageWidth" > 0) AND ("imageHeight" IS NULL OR "imageHeight" > 0)',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'product',
        constraint: 'product_price_nonnegative_ca42cbb6',
        expression: '"priceMinor" >= 0',
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderNotificationDelivery',
        index: 'orderNotificationDelivery_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderNotificationDelivery',
        index: 'orderNotificationDelivery_status_updatedAt_idx_29f913bb',
        columns: ['status', 'updatedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderNotificationDelivery',
        foreignKey: {
          name: 'orderNotificationDelivery_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
