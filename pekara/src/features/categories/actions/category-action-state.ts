export type CategoryActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialCategoryActionState: CategoryActionState = {
  status: 'idle',
};
