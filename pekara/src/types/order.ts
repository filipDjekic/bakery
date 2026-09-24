export type PublicOrderStatus =
  'NEW' | 'ACCEPTED' | 'IN_PREPARATION' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type OrderConfirmationDto = {
  orderId: string;
  orderNumber: string;
  status: PublicOrderStatus;
  pickupAt: string;
  totalMinor: number;
  currencyCode: string;
};

export type OrderErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PRODUCT_UNAVAILABLE'
  | 'PRICE_CHANGED'
  | 'INVALID_PICKUP_SLOT'
  | 'ORDERS_DISABLED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type PublicErrorResponse = {
  error: {
    code: OrderErrorCode;
    message: string;
    details?: OrderConflictDetails;
  };
  requestId: string;
};

export type OrderConflictItem = {
  productId: string;
  productName: string | null;
  previousPriceMinor?: number;
  currentPriceMinor?: number;
};

export type OrderConflictDetails = { items: OrderConflictItem[] };
