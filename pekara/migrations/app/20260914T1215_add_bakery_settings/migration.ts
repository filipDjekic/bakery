#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/579b9b1776c1c6358abf204ae64bf084a00d967b99e73e112cea617a6aefd5d6/contract';
import endContract from '../../snapshots/579b9b1776c1c6358abf204ae64bf084a00d967b99e73e112cea617a6aefd5d6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8f1e819d0a6ed9ab276ba6a42d1871eed017e85715da23d6581cdaf17b18322b/contract';
import startContract from '../../snapshots/8f1e819d0a6ed9ab276ba6a42d1871eed017e85715da23d6581cdaf17b18322b/contract.json' with { type: 'json' };
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
        table: 'bakerySettings',
        columns: [
          col('address', 'character varying(250)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 250 } },
          }),
          col('bakeryName', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currencyCode', 'character varying(3)', {
            notNull: true,
            default: lit('RSD'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 3 } },
          }),
          col('id', 'text', {
            notNull: true,
            default: lit('default'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('maximumAdvanceDays', 'int4', {
            notNull: true,
            default: lit(7),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('minimumPreparationMinutes', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('notificationEmail', 'character varying(254)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 254 } },
          }),
          col('orderAcceptingEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('phone', 'character varying(30)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 30 } },
          }),
          col('pickupSlotMinutes', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('timezone', 'character varying(100)', {
            notNull: true,
            default: lit('Europe/Belgrade'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'businessHours',
        columns: [
          col('bakerySettingsId', 'text', {
            notNull: true,
            default: lit('default'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('closeMinute', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('openMinute', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('weekday', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order',
        columns: [
          col('cancellationReason', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currencyCode', 'character varying(3)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 3 } },
          }),
          col('customerEmail', 'character varying(254)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 254 } },
          }),
          col('customerName', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('customerPhone', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('idempotencyKey', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('note', 'character varying(500)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('orderNumber', 'character varying(32)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 32 } },
          }),
          col('payloadHash', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('pickupAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('NEW'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotalMinor', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('totalMinor', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'order_status_check_ca95f5cd',
            "\"status\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'orderItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('orderId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('productId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('productName', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('quantity', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('subtotalMinor', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('unitPriceMinor', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'orderStatusHistory',
        columns: [
          col('changedByUserId', 'text', {
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('orderId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('reason', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('toStatus', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'orderStatusHistory_fromStatus_check_860a7e10',
            "\"fromStatus\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'COMPLETED', 'CANCELLED')",
          ),
          checkExpression(
            'orderStatusHistory_toStatus_check_199b8070',
            "\"toStatus\" IN ('NEW', 'ACCEPTED', 'IN_PREPARATION', 'READY', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_orderNumber_key',
        columns: ['orderNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_idempotencyKey_key',
        columns: ['idempotencyKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'businessHours',
        index: 'businessHours_bakerySettingsId_idx_c2580c9d',
        columns: ['bakerySettingsId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'businessHours',
        index: 'businessHours_bakerySettingsId_weekday_openMinute_idx_35dcae08',
        columns: ['bakerySettingsId', 'weekday', 'openMinute'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_pickupAt_idx_8ab8b8d5',
        columns: ['pickupAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_createdAt_idx_58610442',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItem',
        index: 'orderItem_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItem',
        index: 'orderItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderStatusHistory',
        index: 'orderStatusHistory_orderId_createdAt_idx_cf5e070a',
        columns: ['orderId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderStatusHistory',
        index: 'orderStatusHistory_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'businessHours',
        foreignKey: {
          name: 'businessHours_bakerySettingsId_fkey',
          columns: ['bakerySettingsId'],
          references: {
            schema: 'public',
            table: 'bakerySettings',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItem',
        foreignKey: {
          name: 'orderItem_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItem',
        foreignKey: {
          name: 'orderItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderStatusHistory',
        foreignKey: {
          name: 'orderStatusHistory_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
