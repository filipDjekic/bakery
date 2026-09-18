import { render } from 'react-email';
import { describe, expect, it, vi } from 'vitest';

import type { EmailService, TransactionalEmail } from './email-service';
import type { OrderEmailData } from './order-email-data';
import { sendBakeryNewOrder } from './send-bakery-new-order';
import { sendCustomerOrderConfirmation } from './send-customer-order-confirmation';

const order: OrderEmailData = {
  orderId: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'PK-260918-ABC234',
  customerName: 'Petar Petrović',
  customerEmail: 'petar@example.test',
  pickupAt: '2026-09-19T08:30:00.000Z',
  totalMinor: 1_250,
  currencyCode: 'RSD',
  timezone: 'Europe/Belgrade',
  items: [
    {
      productId: '22222222-2222-4222-8222-222222222222',
      productName: 'Hleb',
      unitPriceMinor: 625,
      quantity: 2,
      subtotalMinor: 1_250,
    },
  ],
  bakery: {
    name: 'Pekara Sunce',
    address: 'Glavna 1, Beograd',
    phone: '+381 11 123 456',
    notificationEmail: 'orders@example.test',
  },
};

function capturingService() {
  let message: TransactionalEmail | undefined;
  const service: EmailService = {
    send: vi.fn(async (nextMessage) => {
      message = nextMessage;
      return { id: 'delivery-1' };
    }),
  };
  return { service, getMessage: () => message };
}

describe('order email notifications', () => {
  it('renders and sends the customer confirmation with order details', async () => {
    const captured = capturingService();

    await expect(
      sendCustomerOrderConfirmation(order, captured.service),
    ).resolves.toBe('sent');
    const message = captured.getMessage();
    expect(message?.to).toBe('petar@example.test');
    expect(message?.subject).toContain(order.orderNumber);
    const html = await render(message!.react);
    expect(html).toContain(order.orderNumber);
    expect(html).toContain('Hleb');
    expect(html).toContain('Pekara Sunce');
    expect(html).toContain('+381 11 123 456');
  });

  it('skips a missing customer address and absorbs provider failure', async () => {
    await expect(
      sendCustomerOrderConfirmation(
        { ...order, customerEmail: undefined },
        capturingService().service,
      ),
    ).resolves.toBe('skipped');
    await expect(
      sendCustomerOrderConfirmation(order, {
        send: vi.fn().mockRejectedValue(new Error('provider unavailable')),
      }),
    ).resolves.toBe('failed');
  });

  it('renders the bakery notification with a protected admin link', async () => {
    const previousAppUrl = process.env.APP_URL;
    process.env.APP_URL = 'https://pekara.example.test';
    const captured = capturingService();
    try {
      await expect(sendBakeryNewOrder(order, captured.service)).resolves.toBe(
        'sent',
      );
      const message = captured.getMessage();
      expect(message?.to).toBe('orders@example.test');
      const html = await render(message!.react);
      expect(html).toContain(order.orderNumber);
      expect(html).toContain('/admin/orders/');
      expect(html).toContain('zahteva prijavu');
    } finally {
      process.env.APP_URL = previousAppUrl;
    }
  });

  it('skips an unset bakery recipient and absorbs provider failure', async () => {
    await expect(
      sendBakeryNewOrder(
        { ...order, bakery: { ...order.bakery, notificationEmail: null } },
        capturingService().service,
      ),
    ).resolves.toBe('skipped');

    const previousAppUrl = process.env.APP_URL;
    process.env.APP_URL = 'https://pekara.example.test';
    try {
      await expect(
        sendBakeryNewOrder(order, {
          send: vi.fn().mockRejectedValue(new Error('provider unavailable')),
        }),
      ).resolves.toBe('failed');
    } finally {
      process.env.APP_URL = previousAppUrl;
    }
  });
});
