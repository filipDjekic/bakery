import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { PublicOrderStatus } from '../types/order.ts';
import {
  canTransitionOrderStatus,
  ORDER_STATUS_META,
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_ORDER_STATUSES,
} from './order-status.ts';

test('UI metadata covers every order status with a visible label', () => {
  const statuses: PublicOrderStatus[] = [
    'NEW',
    'ACCEPTED',
    'IN_PREPARATION',
    'READY',
    'COMPLETED',
    'CANCELLED',
  ];

  assert.deepEqual(Object.keys(ORDER_STATUS_META), statuses);
  for (const status of statuses) {
    assert.ok(ORDER_STATUS_META[status].label.length > 0);
    assert.ok(ORDER_STATUS_META[status].badgeClassName.length > 0);
  }
});

test('allows only forward workflow transitions and cancellation', () => {
  assert.equal(canTransitionOrderStatus('NEW', 'ACCEPTED'), true);
  assert.equal(canTransitionOrderStatus('ACCEPTED', 'IN_PREPARATION'), true);
  assert.equal(canTransitionOrderStatus('IN_PREPARATION', 'READY'), true);
  assert.equal(canTransitionOrderStatus('READY', 'COMPLETED'), true);
  assert.equal(canTransitionOrderStatus('READY', 'CANCELLED'), true);
  assert.equal(canTransitionOrderStatus('READY', 'ACCEPTED'), false);
  assert.equal(canTransitionOrderStatus('NEW', 'READY'), false);
});

test('completed and cancelled statuses are terminal', () => {
  const statuses: PublicOrderStatus[] = ['COMPLETED', 'CANCELLED'];

  for (const status of statuses) {
    assert.equal(TERMINAL_ORDER_STATUSES.has(status), true);
    assert.deepEqual(ORDER_STATUS_TRANSITIONS[status], []);
    for (const target of Object.keys(
      ORDER_STATUS_TRANSITIONS,
    ) as PublicOrderStatus[]) {
      assert.equal(canTransitionOrderStatus(status, target), false);
    }
  }
});
