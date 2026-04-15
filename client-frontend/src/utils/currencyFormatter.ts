// Currency symbol mapping
const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
};

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currency?: string): string => {
  if (!currency) return '$'; // Default to USD
  return currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
};

/**
 * Format a number as currency with the appropriate symbol
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency?: string,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
  } = options || {};

  // Handle null/undefined values
  const safeAmount = amount ?? 0;

  // Ensure minimumFractionDigits doesn't exceed maximumFractionDigits
  const safeminimumFractionDigits = Math.min(minimumFractionDigits, maximumFractionDigits);

  const formattedNumber = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: safeminimumFractionDigits,
    maximumFractionDigits,
  });

  if (!showSymbol) {
    return formattedNumber;
  }

  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formattedNumber}`;
};

/**
 * Parse currency string to get the numeric value
 */
export const parseCurrencyString = (currencyString: string): number => {
  // Remove currency symbols and commas, then parse
  const numericString = currencyString.replace(/[^0-9.-]/g, '');
  return parseFloat(numericString) || 0;
};
