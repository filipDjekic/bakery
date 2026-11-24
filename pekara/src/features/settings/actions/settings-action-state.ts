export type SettingsActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
  updatedAt?: string;
};
export const initialSettingsActionState: SettingsActionState = {
  status: 'idle',
};
