import React from 'react';
import { PropertyBrowseLayout } from '@/components/property/PropertyBrowseLayout';

/**
 * Backward compatibility wrapper for PropertyBrowsePage.
 * Delegates to the unified PropertyBrowseLayout.
 */
export function PropertyBrowsePage({ mode = 'sale' }) {
  return <PropertyBrowseLayout mode={mode} />;
}

export default PropertyBrowsePage;
