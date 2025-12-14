/**
 * Phone and Email Validation & Normalization Utility
 */

/**
 * Normalize phone number to E.164 format
 * Ensures: +[country code][number] with no spaces or special chars
 * @param countryCode - Should be like '+91' or '91'
 * @param mobileNo - Phone number without country code
 * @returns E.164 formatted phone number
 */
export function normalizeE164(countryCode: string, mobileNo: string): string {
  // Remove all spaces, hyphens, parentheses
  const cleanedMobile = mobileNo.replace(/[\s\-()]/g, '');
  
  // Ensure country code starts with +
  let normalizedCountryCode = countryCode.trim();
  if (!normalizedCountryCode.startsWith('+')) {
    normalizedCountryCode = '+' + normalizedCountryCode;
  }

  // Validate it's a valid E.164 start
  if (!/^\+\d{1,3}$/.test(normalizedCountryCode)) {
    throw new Error('Invalid country code format. Expected +XX or XX');
  }

  // Validate mobile part is digits only
  if (!/^\d+$/.test(cleanedMobile)) {
    throw new Error('Mobile number must contain only digits');
  }

  return normalizedCountryCode + cleanedMobile;
}

/**
 * Validate and normalize email
 * Returns null if email is empty/whitespace, lowercase if valid
 * @param email - Email to normalize
 * @returns Lowercase email or null
 */
export function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null;
  
  const trimmed = email.trim();
  if (trimmed === '') return null;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed.toLowerCase();
}

/**
 * Determine contact type from email or phone
 * @param email - Email address or undefined
 * @returns OtpType.EMAIL if email provided, OtpType.PHONE otherwise
 */
import { OtpType } from '@prisma/client';

export function getContactType(email: string | undefined): OtpType {
  return email ? OtpType.EMAIL : OtpType.PHONE;
}

/**
 * Get contact identifier from email or phone
 * @param email - Email or undefined
 * @param countryCode - Country code
 * @param mobileNo - Mobile number
 * @returns Either email (lowercase) or E.164 phone
 */
export function getContact(
  email: string | undefined,
  countryCode: string,
  mobileNo: string,
): string {
  if (email) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new Error('Email is empty');
    }
    return normalized;
  }

  return normalizeE164(countryCode, mobileNo);
}
