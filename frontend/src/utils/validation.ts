/**
 * Shared input validation and sanitization utilities.
 */

export const sanitizeBankName = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z\s]/g, '').slice(0, 50);

export const isValidBankName = (value: string): boolean =>
  /^[A-Z\s]{2,50}$/.test((value || '').trim());

export const sanitizeAccountNumber = (value: string): string =>
  (value || '').replace(/\D/g, '').slice(0, 19);

export const isValidAccountNumber = (value: string): boolean =>
  /^\d{10,19}$/.test((value || '').trim());

export const sanitizeIfscCode = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);

export const isValidIfscCode = (value: string): boolean =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test((value || '').trim());

export const sanitizeUtrNumber = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22);

export const isValidUtrNumber = (value: string): boolean =>
  /^[A-Z0-9]{6,22}$/.test((value || '').trim());

export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());

export const isValidUpiId = (value: string): boolean =>
  /^[\w.-]+@[\w.-]+$/.test((value || '').trim());

export const sanitizeTenDigitPhone = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length > 0 && !/^[6-9]/.test(digits)) return '';
  return digits;
};

export const isValidTenDigitPhone = (value: string): boolean =>
  /^[6-9]\d{9}$/.test((value || '').trim());

export const sanitizeSixDigitPinCode = (value: string): string =>
  (value || '').replace(/\D/g, '').slice(0, 6);

export const isValidSixDigitPinCode = (value: string): boolean =>
  /^\d{6}$/.test((value || '').trim());

export const isValidUrl = (value: string): boolean =>
  /^https?:\/\/.+/i.test((value || '').trim());
