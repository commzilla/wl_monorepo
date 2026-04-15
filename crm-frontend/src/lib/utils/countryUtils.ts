
/**
 * Converts ISO 3166-1 alpha-2 country codes to full country names
 * using the browser's built-in Intl.DisplayNames API
 */
export function getCountryName(
  countryCode: string,
  locale: string = 'en'
): string {
  try {
    // Validate that we have a country code
    if (!countryCode || typeof countryCode !== 'string') {
      return countryCode || 'Unknown';
    }

    // Ensure the country code is uppercase (ISO standard)
    const normalizedCode = countryCode.trim().toUpperCase();
    
    // Validate country code format (should be exactly 2 characters)
    if (normalizedCode.length !== 2) {
      return countryCode;
    }

    // Create DisplayNames instance for the specified locale
    const displayNames = new Intl.DisplayNames([locale], {
      type: 'region',
      fallback: 'code'
    });

    // Get the country name
    const countryName = displayNames.of(normalizedCode);
    
    // If the result is the same as input, it means the code wasn't recognized
    return countryName === normalizedCode ? countryCode : countryName || countryCode;
  } catch (error) {
    // Fallback to original code if any error occurs
    console.warn(`Failed to get country name for code "${countryCode}":`, error);
    return countryCode;
  }
}

/**
 * Gets country name with additional fallback handling for common edge cases
 */
export function getCountryNameSafe(
  countryCode: string,
  locale: string = 'en'
): string {
  const result = getCountryName(countryCode, locale);
  
  // Additional fallback for empty or undefined codes
  if (!result || result.trim() === '') {
    return 'Not specified';
  }
  
  return result;
}
