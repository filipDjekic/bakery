import 'server-only';
import { AppError } from '../errors/app-error.ts';

export const ORDER_BODY_LIMIT_BYTES = 32 * 1024;

export async function readBoundedJson(
  request: Request,
  maximum = ORDER_BODY_LIMIT_BYTES,
): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
    'application/json'
  )
    throw new AppError({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  const declared = request.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > maximum)
    throw new AppError({ code: 'PAYLOAD_TOO_LARGE' });
  const reader = request.body?.getReader();
  if (!reader) throw new AppError({ code: 'VALIDATION_ERROR' });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel().catch(() => undefined);
        throw new AppError({ code: 'PAYLOAD_TOO_LARGE' });
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError({ code: 'VALIDATION_ERROR' });
  } finally {
    reader.releaseLock();
  }
}
