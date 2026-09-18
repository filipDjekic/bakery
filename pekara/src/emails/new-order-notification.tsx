import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'react-email';

export type NewOrderNotificationEmailProps = {
  orderNumber: string;
  pickupLabel: string;
  totalLabel: string;
  adminOrderUrl: string;
};

export function NewOrderNotificationEmail({
  orderNumber,
  pickupLabel,
  totalLabel,
  adminOrderUrl,
}: NewOrderNotificationEmailProps) {
  return (
    <Html lang="sr-Latn">
      <Head />
      <Preview>Nova porudžbina {orderNumber}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Nova porudžbina</Heading>
          <Text>
            Porudžbina <strong>{orderNumber}</strong> je uspešno kreirana.
          </Text>
          <Text>
            Preuzimanje: <strong>{pickupLabel}</strong>
            <br />
            Ukupno: <strong>{totalLabel}</strong>
          </Text>
          <Button href={adminOrderUrl} style={styles.button}>
            Otvori porudžbinu u admin panelu
          </Button>
          <Text style={styles.muted}>
            Link vodi na zaštićenu admin stranicu i zahteva prijavu.
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
    maxWidth: '520px',
    padding: '32px',
  },
  heading: { color: '#18181b', fontSize: '26px' },
  button: {
    backgroundColor: '#18181b',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    marginTop: '16px',
    padding: '12px 18px',
    textDecoration: 'none',
  },
  muted: { color: '#71717a', fontSize: '13px', marginTop: '24px' },
} as const;
