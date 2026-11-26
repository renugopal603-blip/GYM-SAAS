/**
 * Strips any non-digit characters (alphabets, symbols, spaces),
 * enforces that phone numbers must start with 6, 7, 8, or 9 (not 0-5),
 * and limits phone numbers to at most 10 digits.
 */
export const sanitizeTenDigitPhone = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length > 0 && !/^[6-9]/.test(digits)) return '';
  return digits;
};

/**
 * Returns true when the value consists of exactly 10 numeric digits starting with 6, 7, 8, or 9.
 */
export const isValidTenDigitPhone = (value: string): boolean =>
  /^[6-9]\d{9}$/.test(value || '');

/**
 * Strips any non-digit characters (alphabets, symbols, spaces)
 * and limits PIN codes to at most 6 digits.
 */
export const sanitizeSixDigitPinCode = (value: string): string =>
  (value || '').replace(/\D/g, '').slice(0, 6);

/**
 * Returns true when the value consists of exactly 6 numeric digits.
 */
export const isValidSixDigitPinCode = (value: string): boolean =>
  /^\d{6}$/.test(value || '');

/**
 * Sanitizes Bank Name: forces uppercase letters and spaces only, up to 50 characters.
 */
export const sanitizeBankName = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z\s]/g, '').slice(0, 50);

/**
 * Returns true if the Bank Name contains only uppercase letters and spaces (2 to 50 characters).
 */
export const isValidBankName = (value: string): boolean =>
  /^[A-Z\s]{2,50}$/.test((value || '').trim());

/**
 * Strips non-digit characters and limits Account Number to 19 digits.
 */
export const sanitizeAccountNumber = (value: string): string =>
  (value || '').replace(/\D/g, '').slice(0, 19);

/**
 * Returns true if the Account Number is between 10 and 19 numeric digits.
 */
export const isValidAccountNumber = (value: string): boolean =>
  /^\d{10,19}$/.test((value || '').trim());

/**
 * Forces uppercase alphanumeric characters up to 11 characters for IFSC Code.
 */
export const sanitizeIfscCode = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);

/**
 * Returns true if the IFSC code matches standard RBI format:
 * 4 letters, 0, followed by 6 alphanumeric characters (total 11 chars).
 */
export const isValidIfscCode = (value: string): boolean =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test((value || '').trim());

/**
 * Sanitizes Bank UTR / Transaction Reference ID (alphanumeric up to 22 characters).
 */
export const sanitizeUtrNumber = (value: string): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22);

/**
 * Returns true if the UTR / Reference ID is between 6 and 22 alphanumeric characters.
 */
export const isValidUtrNumber = (value: string): boolean =>
  /^[A-Z0-9]{6,22}$/.test((value || '').trim());

/**
 * Returns true if string is a valid email format.
 */
export const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());

/**
 * Returns true if string is a valid UPI ID (e.g. name@bank or 9876543210@paytm).
 */
export const isValidUpiId = (value: string): boolean =>
  /^[\w.-]+@[\w.-]+$/.test((value || '').trim());

/**
 * Returns true if string is a valid URL starting with http:// or https://.
 */
export const isValidUrl = (value: string): boolean =>
  /^https?:\/\/.+/i.test((value || '').trim());


