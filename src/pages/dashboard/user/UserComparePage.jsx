import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ComparePage } from '@/pages/ComparePage';

export function UserComparePage() {
  return (
    <DashboardLayout role="user">
      <ComparePage inDashboard={true} />
    </DashboardLayout>
  );
}

export default UserComparePage;
