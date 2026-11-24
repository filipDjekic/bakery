export type ProductActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Record<string, string>;
};
export const initialProductActionState: ProductActionState = { status: 'idle' };
