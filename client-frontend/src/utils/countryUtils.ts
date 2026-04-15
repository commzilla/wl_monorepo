
/**
 * Converts ISO 3166-1 alpha-2 country codes to full country names
 * using the browser's built-in Intl.DisplayNames API
 */
export function getCountryName(countryCode: string, locale: string = 'en'): string {
  try {
    // Validate input
    if (!countryCode || typeof countryCode !== 'string') {
      return countryCode || '';
    }

    // Ensure country code is uppercase and exactly 2 characters
    const normalizedCode = countryCode.trim().toUpperCase();
    if (normalizedCode.length !== 2) {
      return countryCode;
    }

    // Check if Intl.DisplayNames is supported
    if (!Intl.DisplayNames) {
      console.warn('Intl.DisplayNames is not supported in this browser');
      return countryCode;
    }

    // Create DisplayNames instance for the specified locale
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    
    // Get the country name
    const countryName = displayNames.of(normalizedCode);
    
    // Return the country name if found, otherwise return the original code
    return countryName || countryCode;
  } catch (error) {
    console.warn(`Failed to get country name for code "${countryCode}":`, error);
    return countryCode;
  }
}
