import 'server-only';
import { cookies } from 'next/headers';
/** A UI-only, short-lived message consumed after a Server Action redirect. */
export async function setSuccessFlash(message: string) {
  (await cookies()).set('bakery-notice', message.slice(0, 200), {
    path: '/',
    maxAge: 60,
    sameSite: 'lax',
    secure:
      process.env.APP_URL?.startsWith('https://') ??
      process.env.NODE_ENV === 'production',
    httpOnly: false,
  });
}
