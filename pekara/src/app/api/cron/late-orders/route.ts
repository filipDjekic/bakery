import { timingSafeEqual } from 'node:crypto';
import { processLateOrders } from '@/server/services/process-late-orders';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    let processed = 0;
    // Bound invocation time; future invocations catch up after interruption.
    const started = Date.now();
    for (
      let batch = 0;
      batch < 8 && Date.now() - started < 45_000;
      batch += 1
    ) {
      const result = await processLateOrders();
      processed += result.processed;
      if (!result.hasMore) break;
    }
    return Response.json(
      { processed },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    console.error('Scheduled late-order processing failed.');
    return Response.json({ error: 'Obrada nije uspela.' }, { status: 500 });
  }
}
