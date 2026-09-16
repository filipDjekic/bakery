import type { OrderConfirmationDto, OrderErrorCode } from '@/types/order';
import type { CheckoutRequestInput } from '@/validation/checkout';

export type CreateOrderRequest = CheckoutRequestInput;
export type CreateOrderResponse = OrderConfirmationDto;

export type CreateOrderErrorResponse = {
  error: {
    code: OrderErrorCode;
    message: string;
  };
  requestId: string;
};
