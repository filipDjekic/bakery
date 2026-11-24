import { createOrdersPostHandler } from '../../../server/http/orders.ts';

export const POST = createOrdersPostHandler();

export const maxDuration = 30;
