#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04763c267ada033da37356af8f0e18098661a31fe2e411df5f8e028caaf3a118/contract';
import startContract from '../../snapshots/04763c267ada033da37356af8f0e18098661a31fe2e411df5f8e028caaf3a118/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/44f18c87223ebfb1181b58783833a78f77938664b645befee14662de5d0de866/contract';
import endContract from '../../snapshots/44f18c87223ebfb1181b58783833a78f77938664b645befee14662de5d0de866/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_late_snapshot_presence_5c416ba4',
        expression:
          '("lateDiscountAt" IS NULL) = ("originalTotalMinor" IS NULL) AND ("status" <> \'LATE\' OR "lateDiscountAt" IS NOT NULL)',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
