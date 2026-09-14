#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8f1e819d0a6ed9ab276ba6a42d1871eed017e85715da23d6581cdaf17b18322b/contract';
import endContract from '../../snapshots/8f1e819d0a6ed9ab276ba6a42d1871eed017e85715da23d6581cdaf17b18322b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'category',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'character varying(300)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 300 } },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(80)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 80 } },
          }),
          col('slug', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product',
        columns: [
          col('categoryId', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'character varying(1000)', {
            notNull: true,
            codecRef: {
              codecId: 'sql/varchar@1',
              typeParams: { length: 1000 },
            },
          }),
          col('id', 'uuid', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('imageHeight', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('imagePathname', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('imageWidth', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isAvailable', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(120)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 120 } },
          }),
          col('priceMinor', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('slug', 'character varying(140)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 140 } },
          }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'category',
        constraint: 'category_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product',
        constraint: 'product_slug_key',
        columns: ['slug'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category',
        index: 'category_isActive_sortOrder_idx_43c1fe34',
        columns: ['isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_categoryId_isActive_isAvailable_sortOrder_idx_7aa618ff',
        columns: ['categoryId', 'isActive', 'isAvailable', 'sortOrder'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product',
        foreignKey: {
          name: 'product_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
