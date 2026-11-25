'use client';
import { create } from 'zustand';
export const TOAST_DURATION = 5000;
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
  closing?: boolean;
};
let sequence = 0;
export const useToastStore = create<{ messages: ToastMessage[] }>(() => ({
  messages: [],
}));
export function dismissToast(id: number) {
  useToastStore.setState((state) => ({
    messages: state.messages.map((item) =>
      item.id === id ? { ...item, closing: true } : item,
    ),
  }));
  setTimeout(
    () =>
      useToastStore.setState((state) => ({
        messages: state.messages.filter((item) => item.id !== id),
      })),
    200,
  );
}
function show(type: ToastType, message: string) {
  const id = ++sequence;
  useToastStore.setState((state) => ({
    messages: [...state.messages, { id, type, message }],
  }));
  return id;
}
export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  warning: (message: string) => show('warning', message),
  info: (message: string) => show('info', message),
};
