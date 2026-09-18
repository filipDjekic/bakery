import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';

export type OrderConfirmationEmailProps = {
  bakeryName: string;
  bakeryAddress: string;
  bakeryPhone: string;
  customerName: string;
  orderNumber: string;
  pickupLabel: string;
  totalLabel: string;
  items: Array<{
    name: string;
    quantity: number;
    subtotalLabel: string;
  }>;
};

export function OrderConfirmationEmail({
  bakeryName,
  bakeryAddress,
  bakeryPhone,
  customerName,
  orderNumber,
  pickupLabel,
  totalLabel,
  items,
}: OrderConfirmationEmailProps) {
  return (
    <Html lang="sr-Latn">
      <Head />
      <Preview>Potvrda porudžbine {orderNumber}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Hvala na porudžbini</Heading>
          <Text>Zdravo {customerName},</Text>
          <Text>
            Primili smo porudžbinu <strong>{orderNumber}</strong>. Preuzimanje
            je zakazano za <strong>{pickupLabel}</strong>.
          </Text>
          <Section style={styles.items}>
            {items.map((item, index) => (
              <Text key={`${item.name}-${index}`} style={styles.item}>
                {item.quantity} × {item.name} — {item.subtotalLabel}
              </Text>
            ))}
          </Section>
          <Hr style={styles.rule} />
          <Text style={styles.total}>Ukupno: {totalLabel}</Text>
          <Text style={styles.muted}>
            {bakeryName} · {bakeryAddress} · {bakeryPhone}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif' },
  container: {
    backgroundColor: '#ffffff',
    margin: '32px auto',
    maxWidth: '560px',
    padding: '32px',
  },
  heading: { color: '#18181b', fontSize: '26px' },
  items: { margin: '24px 0' },
  item: { color: '#3f3f46', margin: '8px 0' },
  rule: { borderColor: '#e4e4e7', margin: '24px 0' },
  total: { color: '#18181b', fontSize: '18px', fontWeight: 'bold' },
  muted: { color: '#71717a', fontSize: '13px', marginTop: '28px' },
} as const;
