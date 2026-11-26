import { getPickupAvailability } from '@/server/services/pickup-slots';
import { mapErrorToResponse } from '@/server/errors/http-error-mapper';
import { requestIdFor } from '@/server/logging/request-id';

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  try {
    return Response.json(await getPickupAvailability(), {
      headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
    });
  } catch (error) {
    const response = mapErrorToResponse(error, requestId);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
