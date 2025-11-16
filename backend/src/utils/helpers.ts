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
 * Normalize emoji for WhatsApp compatibility, especially on iPhone
 * iPhone is very strict about emoji format and requires proper Unicode encoding
 * @param emoji - The emoji string to normalize
 * @returns Normalized emoji string
 */
export function normalizeEmoji(emoji: string): string {
  if (!emoji || typeof emoji !== 'string') {
    return '❤️'; // Default fallback
  }

  // Trim whitespace
  let trimmed = emoji.trim();
  if (trimmed === '') {
    return '❤️'; // Default fallback
  }

  try {
    // Step 1: Normalize to NFC (Canonical Composition) first
    // This combines characters into their composed form - required for iPhone
    let normalized = trimmed.normalize('NFC');
    
    // Step 2: For iPhone, we need to ensure proper emoji format
    // iPhone is very strict - it expects emojis in a specific Unicode format
    // Most emojis work better in NFC format, but we need to ensure they're valid
    
    // Step 3: Check if the emoji contains valid emoji characters
    // Keep zero-width joiners (\u200D) as they're needed for compound emojis (like 👨‍👩‍👧‍👦)
    // But ensure the format is correct
    
    // Step 4: Remove any text variation selectors that might cause issues on iPhone
    // Keep emoji variation selectors (\uFE0F) as they're often needed
    // But remove text variation selectors (\uFE00-\uFE0E) which can cause problems
    normalized = normalized.replace(/[\uFE00-\uFE0E]/g, '');
    
    // Step 5: Ensure we have a valid emoji
    // Extract only emoji-related characters (including zero-width joiners for compound emojis)
    const emojiPattern = /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}\u200D\uFE0F]/gu;
    const matches = normalized.match(emojiPattern);
    
    if (matches && matches.length > 0) {
      // Reconstruct the emoji from valid parts
      normalized = matches.join('');
    }
    
    // Step 6: Final NFC normalization to ensure consistency for iPhone
    normalized = normalized.normalize('NFC');
    
    // Step 7: If we ended up with an empty string, return default
    if (normalized.length === 0) {
      return '❤️';
    }
    
    return normalized;
  } catch (error) {
    // If normalization fails, try to return a safe version
    console.warn(`[Helpers] Failed to normalize emoji "${emoji}":`, error);
    
    // Try to extract just the first emoji character
    try {
      const firstChar = trimmed.charAt(0);
      if (firstChar && firstChar.match(/\p{Emoji}/u)) {
        return firstChar.normalize('NFC');
      }
    } catch (e) {
      // Ignore
    }
    
    return '❤️'; // Default fallback
  }
}

