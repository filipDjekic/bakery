#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/579b9b1776c1c6358abf204ae64bf084a00d967b99e73e112cea617a6aefd5d6/contract';
import startContract from '../../snapshots/579b9b1776c1c6358abf204ae64bf084a00d967b99e73e112cea617a6aefd5d6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/91f809354a00d517030632f43fe9ca87eca2ea1fc8b276945e412f9960b163d3/contract';
import endContract from '../../snapshots/91f809354a00d517030632f43fe9ca87eca2ea1fc8b276945e412f9960b163d3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'actionRateLimitBucket',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('keyHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('windowSeconds', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('windowStart', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'actionRateLimitBucket',
        constraint: 'actionRateLimitBucket_keyHash_action_windowStart_windowSeconds_key',
        columns: ['keyHash', 'action', 'windowStart', 'windowSeconds'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'actionRateLimitBucket',
        index: 'actionRateLimitBucket_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
