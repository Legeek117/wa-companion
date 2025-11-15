/**
 * Utility helper functions
 */

export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Normalize emoji to NFC (Normalization Form Canonical Composition)
 * This ensures emojis are correctly encoded for WhatsApp, especially on iPhone
 * iPhone requires emojis to be in NFC format for proper display
 * @param emoji - The emoji string to normalize
 * @returns Normalized emoji string
 */
export function normalizeEmoji(emoji: string): string {
  if (!emoji || typeof emoji !== 'string') {
    return '❤️'; // Default fallback
  }

  // Trim whitespace
  const trimmed = emoji.trim();
  if (trimmed === '') {
    return '❤️'; // Default fallback
  }

  // Normalize to NFC (Canonical Composition)
  // This is critical for iPhone compatibility - iPhone expects NFC format
  // NFC combines characters into their composed form (e.g., é instead of e + ́)
  try {
    const normalized = trimmed.normalize('NFC');
    return normalized;
  } catch (error) {
    // If normalization fails, return default
    console.warn(`[Helpers] Failed to normalize emoji "${emoji}":`, error);
    return '❤️';
  }
}

