import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizeCustomerPhone(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromString(trimmedValue, 'RS');

  if (!phoneNumber?.isValid()) {
    return null;
  }

  return phoneNumber.number;
}
