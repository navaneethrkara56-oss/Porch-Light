import React from 'react';

/**
 * Currency formatting for Indian Rupee (INR)
 * Short form: Rs 85 L, Rs 2.4 Cr
 * Full form: 1,25,00,000 or ₹1,25,00,000
 * Rent: 35,000 / month
 */

export function formatINR(amount, options = {}) {
  if (amount == null || isNaN(amount)) return options.withSymbol ? '₹0' : '0';
  const num = Number(amount);
  
  if (options.short) {
    let formattedShort = '';
    if (num >= 10000000) {
      const cr = num / 10000000;
      formattedShort = `Rs ${Number(cr.toFixed(2))} Cr`;
    } else if (num >= 100000) {
      const l = num / 100000;
      formattedShort = `Rs ${Number(l.toFixed(2))} L`;
    } else if (num >= 1000) {
      const k = num / 1000;
      formattedShort = `Rs ${Number(k.toFixed(1))} K`;
    } else {
      formattedShort = `Rs ${num}`;
    }

    if (options.rent) {
      return `${formattedShort} / month`;
    }
    return formattedShort;
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);

  if (options.rent) {
    if (options.withSymbol) {
      return `₹${formatted} / month`;
    }
    return `${formatted} / month`;
  }

  if (options.withSymbol) {
    return `₹${formatted}`;
  }

  return formatted;
}

/**
 * Returns formatted INR broken down into symbol, amount, and optional suffix.
 * Enables styling the rupee glyph with a reliable font stack (Manrope / system-ui)
 * while preserving Instrument Serif for numeric digits.
 */
export function formatINRPieces(amount, options = {}) {
  if (amount == null || isNaN(amount)) {
    return { symbol: '₹', amount: '0', suffix: options.rent ? ' / month' : '' };
  }
  const formatted = formatINR(amount, { ...options, withSymbol: false, rent: false });
  const cleanAmount = String(formatted).replace(/^(Rs\.?|₹)\s*/i, '');
  return {
    symbol: '₹',
    amount: cleanAmount,
    suffix: options.rent ? ' / month' : (options.suffix || ''),
  };
}

/**
 * RupeeSymbol
 * Renders the Indian Rupee symbol using the robust Manrope/system-ui sans-serif font stack.
 * Prevents missing/broken glyph rendering in serif display fonts (Instrument Serif).
 */
export function RupeeSymbol({ className = '' }) {
  return React.createElement(
    'span',
    {
      'aria-hidden': true,
      style: { fontFamily: 'Manrope, system-ui, -apple-system, sans-serif' },
      className: `font-normal inline-block select-none ${className}`,
    },
    '₹'
  );
}

export function formatArea(sqft) {
  if (sqft == null || isNaN(sqft)) return '0 sq ft';
  const formatted = new Intl.NumberFormat('en-IN').format(sqft);
  return `${formatted} sq ft`;
}

/**
 * Returns formatted price for a property record as fixed numeric value.
 */
export function formatPropertyPrice(property, options = {}) {
  if (!property || property.price == null) return options.short ? '—' : 'Fixed price';
  const isRent = options.rent !== undefined ? options.rent : property.listingType === 'rent';
  return formatINR(property.price, { ...options, rent: isRent });
}

export default formatINR;
