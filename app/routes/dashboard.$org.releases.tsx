/**
 * Release Management - Layout Route
 * Parent layout for all /releases routes
 * Checks if release management is set up and redirects to setup if needed
 */

import { useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from '@remix-run/react';
import { useTenantInfo } from '~/hooks/useTenantInfo';
import { Flex, Loader, Text } from '@mantine/core';

export default function ReleasesLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { org } = params;

  // Fetch tenant info (includes release management setup status)
  const { data: tenantInfo, isLoading, error } = useTenantInfo(org);

  useEffect(() => {
    // Skip redirect logic if we're already on the setup page
    if (location.pathname.includes('/releases/setup')) {
      return;
    }

    // Once data is loaded, check if setup is complete
    const setupComplete = tenantInfo?.releaseManagement?.setupComplete;
    if (tenantInfo && !setupComplete) {
      console.log('Release management not set up, redirecting to setup wizard');
      navigate(`/dashboard/${org}/releases/setup`);
    }
  }, [tenantInfo, navigate, org, location.pathname]);

  // Show loading state while checking setup status
  if (isLoading) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ minHeight: '400px' }}
        gap="md"
      >
        <Loader size="lg" />
        <Text size="sm" c="dimmed">Checking release management setup...</Text>
      </Flex>
    );
  }

  // Show error state if setup check failed
  if (error) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ minHeight: '400px' }}
        gap="md"
      >
        <Text size="lg" fw={600} c="red">Failed to check setup status</Text>
        <Text size="sm" c="dimmed">Please try again or contact support</Text>
      </Flex>
    );
  }

  const setupComplete = tenantInfo?.releaseManagement?.setupComplete;

  // If setup is not complete and we're not on setup page, show loading
  // (the useEffect will handle the redirect)
  if (tenantInfo && !setupComplete && !location.pathname.includes('/releases/setup')) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ minHeight: '400px' }}
        gap="md"
      >
        <Loader size="lg" />
        <Text size="sm" c="dimmed">Redirecting to setup wizard...</Text>
      </Flex>
    );
  }

  // Render child routes
  return <Outlet />;
}

