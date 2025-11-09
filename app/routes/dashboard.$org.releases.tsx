/**
 * Release Management - Layout Route
 * Parent layout for all /releases routes
 */

import { Outlet } from '@remix-run/react';

export default function ReleasesLayout() {
  return <Outlet />;
}

