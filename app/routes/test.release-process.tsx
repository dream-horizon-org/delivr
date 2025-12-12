/**
 * Test Page: Release Process Infrastructure
 * 
 * Simple test page to verify Phase 1 infrastructure:
 * - API routing works
 * - Hooks can fetch data
 * - Mock server responds correctly
 * 
 * Access at: /test/release-process?tenantId=tenant_123&releaseId=rel_dev
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Container, Title, Paper, Text, Code, Stack, Badge, Button, Group } from '@mantine/core';
import { useKickoffStage, useRegressionStage } from '~/hooks/useReleaseProcess';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_123';
  const releaseId = url.searchParams.get('releaseId') || 'rel_dev';

  return json({ tenantId, releaseId });
}

export default function TestReleaseProcessPage() {
  const { tenantId, releaseId } = useLoaderData<typeof loader>();

  // Debug: Log the values
  console.log('[TestPage] tenantId:', tenantId, 'releaseId:', releaseId);
  console.log('[TestPage] Query enabled check:', !!tenantId && !!releaseId);

  // Test hooks (go through authenticated BFF routes)
  const kickoffQuery = useKickoffStage(tenantId, releaseId);
  const regressionQuery = useRegressionStage(tenantId, releaseId);

  // Debug: Log query state
  console.log('[TestPage] kickoffQuery state:', {
    isLoading: kickoffQuery.isLoading,
    isFetching: kickoffQuery.isFetching,
    isEnabled: !!tenantId && !!releaseId,
    error: kickoffQuery.error,
    data: kickoffQuery.data,
  });

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>Release Process Infrastructure Test</Title>
        
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Test Parameters:
            </Text>
            <Group gap="xs">
              <Code>tenantId:</Code>
              <Text>{tenantId}</Text>
            </Group>
            <Group gap="xs">
              <Code>releaseId:</Code>
              <Text>{releaseId}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Kickoff Stage Test */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Kickoff Stage API Test</Title>
              <Badge color={kickoffQuery.isLoading ? 'blue' : kickoffQuery.error ? 'red' : 'green'}>
                {kickoffQuery.isLoading ? 'Loading...' : kickoffQuery.error ? 'Error' : 'Success'}
              </Badge>
            </Group>

            {kickoffQuery.isLoading && <Text>Loading kickoff stage data...</Text>}
            
            {kickoffQuery.error && (
              <Paper p="sm" bg="red.0" withBorder>
                <Text size="sm" c="red">
                  Error: {kickoffQuery.error.message}
                </Text>
              </Paper>
            )}

            {kickoffQuery.data && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>Stage Status:</Text>
                <Badge>{kickoffQuery.data.stageStatus}</Badge>
                
                <Text size="sm" fw={500}>Tasks ({kickoffQuery.data.tasks.length}):</Text>
                <Stack gap="xs">
                  {kickoffQuery.data.tasks.map((task) => (
                    <Paper key={task.id} p="xs" withBorder>
                      <Group justify="space-between">
                        <Text size="sm">{task.taskType}</Text>
                        <Badge size="sm" color={
                          task.taskStatus === 'COMPLETED' ? 'green' :
                          task.taskStatus === 'FAILED' ? 'red' :
                          task.taskStatus === 'IN_PROGRESS' ? 'blue' : 'gray'
                        }>
                          {task.taskStatus}
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            )}

            <Button
              onClick={() => kickoffQuery.refetch()}
              disabled={kickoffQuery.isLoading}
              size="sm"
            >
              Refetch
            </Button>
          </Stack>
        </Paper>

        {/* Regression Stage Test */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Regression Stage API Test</Title>
              <Badge color={regressionQuery.isLoading ? 'blue' : regressionQuery.error ? 'red' : 'green'}>
                {regressionQuery.isLoading ? 'Loading...' : regressionQuery.error ? 'Error' : 'Success'}
              </Badge>
            </Group>

            {regressionQuery.isLoading && <Text>Loading regression stage data...</Text>}
            
            {regressionQuery.error && (
              <Paper p="sm" bg="red.0" withBorder>
                <Text size="sm" c="red">
                  Error: {regressionQuery.error.message}
                </Text>
              </Paper>
            )}

            {regressionQuery.data && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>Stage Status:</Text>
                <Badge>{regressionQuery.data.stageStatus}</Badge>
                
                <Text size="sm" fw={500}>Cycles ({regressionQuery.data.cycles.length}):</Text>
                <Stack gap="xs">
                  {regressionQuery.data.cycles.map((cycle) => (
                    <Paper key={cycle.id} p="xs" withBorder>
                      <Group justify="space-between">
                        <Text size="sm">Cycle {cycle.cycleTag || cycle.id}</Text>
                        <Badge size="sm">{cycle.status}</Badge>
                        {cycle.isLatest && <Badge size="xs" color="blue">Latest</Badge>}
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                {regressionQuery.data.currentCycle && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Current Cycle:</Text>
                    <Badge>{regressionQuery.data.currentCycle.cycleTag || regressionQuery.data.currentCycle.id}</Badge>
                  </Stack>
                )}

                <Text size="sm" fw={500}>Tasks ({regressionQuery.data.tasks.length}):</Text>
                <Stack gap="xs">
                  {regressionQuery.data.tasks.map((task) => (
                    <Paper key={task.id} p="xs" withBorder>
                      <Group justify="space-between">
                        <Text size="sm">{task.taskType}</Text>
                        <Badge size="sm" color={
                          task.taskStatus === 'COMPLETED' ? 'green' :
                          task.taskStatus === 'FAILED' ? 'red' :
                          task.taskStatus === 'IN_PROGRESS' ? 'blue' : 'gray'
                        }>
                          {task.taskStatus}
                        </Badge>
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                {regressionQuery.data.availableBuilds && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Available Builds ({regressionQuery.data.availableBuilds.length}):</Text>
                    <Stack gap="xs">
                      {regressionQuery.data.availableBuilds.map((build) => (
                        <Paper key={build.id} p="xs" withBorder>
                          <Text size="sm">{build.platform} - {build.artifactPath}</Text>
                        </Paper>
                      ))}
                    </Stack>
                  </Stack>
                )}

                {regressionQuery.data.approvalStatus && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Approval Status:</Text>
                    <Badge color={regressionQuery.data.approvalStatus.canApprove ? 'green' : 'yellow'}>
                      {regressionQuery.data.approvalStatus.canApprove ? 'Can Approve' : 'Cannot Approve'}
                    </Badge>
                  </Stack>
                )}
              </Stack>
            )}

            <Button
              onClick={() => regressionQuery.refetch()}
              disabled={regressionQuery.isLoading}
              size="sm"
            >
              Refetch
            </Button>
          </Stack>
        </Paper>

        {/* Instructions */}
        <Paper p="md" bg="blue.0" withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={500}>Testing Instructions:</Text>
            <Text size="xs">
              1. Ensure mock server is running: <Code>pnpm run mock-server</Code>
            </Text>
            <Text size="xs">
              2. Ensure DELIVR_HYBRID_MODE=true in your .env file
            </Text>
            <Text size="xs">
              3. Check browser console for API calls and responses
            </Text>
            <Text size="xs">
              4. Verify data matches mock data in db.json
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

