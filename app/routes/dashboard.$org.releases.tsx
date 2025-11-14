/**
 * Release Management - Layout Route
 * Parent layout for all /releases routes
 * Checks if release management is set up and redirects to setup if needed
 */

import { useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, useRouteLoaderData } from '@remix-run/react';
import type { OrgLayoutLoaderData } from './dashboard.$org';

export default function ReleasesLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { org } = params;

  // Get shared tenant data from parent layout (no redundant API call!)
  const orgData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  
  if (!orgData) {
    throw new Error('Organization data not loaded');
  }

  const { organisation } = orgData;
  const setupComplete = organisation?.releaseManagement?.setupComplete;

  useEffect(() => {
    // Skip redirect logic if we're already on the setup page
    if (location.pathname.includes('/releases/setup')) {
      return;
    }

    // If setup is not complete, redirect to setup wizard
    if (!setupComplete) {
      console.log('Release management not set up, redirecting to setup wizard');
      navigate(`/dashboard/${org}/releases/setup`);
    }
  }, [setupComplete, navigate, org, location.pathname]);

  // If setup is not complete and we're not on setup page, don't render children
  // (the useEffect will handle the redirect)
  if (!setupComplete && !location.pathname.includes('/releases/setup')) {
    return null; // Let the useEffect redirect handle navigation
  }

  // Render child routes
  return <Outlet />;
}

