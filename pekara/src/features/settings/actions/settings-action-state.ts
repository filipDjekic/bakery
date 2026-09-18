export type SettingsActionState = {
  status: 'idle' | 'error' | 'success';
  message?: string;
  updatedAt?: string;
};
export const initialSettingsActionState: SettingsActionState = {
  status: 'idle',
};
