import React from 'react';
import { PropertyBrowseLayout } from '@/components/property/PropertyBrowseLayout';

/**
 * Buy Page Route Component (/buy)
 * Displays curated architectural properties, luxury villas, and apartments for sale.
 */
export function BuyPage() {
  return (
    <PropertyBrowseLayout
      mode="sale"
      categoryTag="Acquisition & Ownership"
      pageTitle="Properties for Sale"
      tagline="Curated architectural residences, heritage estates, and luxury penthouses available for purchase across premier Indian cities."
      seoTitle="Properties for Sale | Porch Light"
      seoDescription="Explore RERA-verified luxury properties, heritage villas, and premium apartments for sale in Bangalore, Mumbai, Delhi NCR, and Goa with Porch Light."
    />
  );
}

export default BuyPage;
