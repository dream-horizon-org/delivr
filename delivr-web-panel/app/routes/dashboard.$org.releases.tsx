/**
 * Release Management - Common Parent Layout Route
 * Parent layout for ALL release management pages (dashboard, list, details, etc.)
 */

import { Outlet } from '@remix-run/react';

export default function ReleasesCommonLayout() {
  // Render child routes (dashboard, list, details, create, settings)
  return <Outlet />;
}

