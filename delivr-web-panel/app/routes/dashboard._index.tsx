import { Flex, Box, useMantineTheme } from '@mantine/core';
import { useRouteLoaderData } from '@remix-run/react';
import { OrgsPage } from "~/components/Pages/components/OrgsPage";
import { AuthErrorFallback } from '~/components/Auth/AuthErrorFallback';
import type { DashboardLoaderData } from './dashboard';

export default function DashboardIndex() {
  const theme = useMantineTheme();
  // Use parent route's loader data (dashboard.tsx)
  const dashboardData = useRouteLoaderData<DashboardLoaderData>('routes/dashboard');
  const authError = dashboardData?.authError || null;
  // Show auth error if present
  if (authError) {
    return (
      <Flex h="100vh" direction="column" bg={theme.colors?.slate?.[0] || '#f8fafc'} align="center" justify="center" p={32}>
        <Box style={{ maxWidth: 600, width: '100%' }}>
          <AuthErrorFallback message={authError.message} />
        </Box>
      </Flex>
    );
  }
  
  return <OrgsPage />;
}
