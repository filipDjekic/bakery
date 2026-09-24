import type {
  OrderConfirmationDto,
  OrderConflictDetails,
  OrderErrorCode,
} from '@/types/order';
import type { CheckoutRequestInput } from '@/validation/checkout';

export type CreateOrderRequest = CheckoutRequestInput;
export type CreateOrderResponse = OrderConfirmationDto;

export type CreateOrderErrorResponse = {
  error: {
    code: OrderErrorCode;
    message: string;
    details?: OrderConflictDetails;
  };
  requestId: string;
};
