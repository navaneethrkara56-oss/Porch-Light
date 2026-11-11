import React from 'react';
import { PropertyBrowseLayout } from '@/components/property/PropertyBrowseLayout';

/**
 * Rent Page Route Component (/rent)
 * Displays long-term luxury residences, leased apartments, and estate rentals.
 */
export function RentPage() {
  return (
    <PropertyBrowseLayout
      mode="rent"
      categoryTag="Long-term & Leased Sanctuaries"
      pageTitle="Residences for Rent"
      tagline="Distinguished homes, high-floor penthouses, and tranquil villas available for verified annual and multi-year leases across India."
      seoTitle="Residences for Rent | Porch Light"
      seoDescription="Discover verified luxury rentals, furnished penthouses, and architectural homes for lease in Bangalore, Mumbai, Goa, and Kerala with Porch Light."
    />
  );
}

export default RentPage;
