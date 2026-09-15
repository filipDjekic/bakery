export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string | null;
  displayPriceMinor: number;
  quantity: number;
};

export type AddCartItemInput = Omit<CartItem, 'quantity'>;

export type CartLimitReason =
  | 'INVALID_ITEM'
  | 'INVALID_QUANTITY'
  | 'ITEM_QUANTITY_LIMIT'
  | 'DISTINCT_ITEM_LIMIT'
  | 'TOTAL_QUANTITY_LIMIT'
  | 'ITEM_NOT_FOUND';

export type CartActionResult =
  { ok: true } | { ok: false; reason: CartLimitReason };

export type CartState = {
  items: CartItem[];
  addItem: (item: AddCartItemInput, quantity?: number) => CartActionResult;
  removeItem: (productId: string) => CartActionResult;
  setQuantity: (productId: string, quantity: number) => CartActionResult;
  increment: (productId: string) => CartActionResult;
  decrement: (productId: string) => CartActionResult;
  clear: () => CartActionResult;
};

export type PersistedCartState = Pick<CartState, 'items'>;
