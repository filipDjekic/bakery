export type ProductActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
};
export const initialProductActionState: ProductActionState = { status: 'idle' };
