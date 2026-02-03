/**
 * App onboarding wizard
 * Steps (1-based): 1 = App name, 2 = SCM, 3 = Platform targets, 4 = Store (skippable)
 * Backend setupStatus.step is 1-based. Mantine Stepper uses 0-based index for `active`.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, useRouteLoaderData, useRevalidator, Link } from '@remix-run/react';
import {
  Box,
  Container,
  Stepper,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Paper,
  Checkbox,
  useMantineTheme,
} from '@mantine/core';
import { IconBrandGithub, IconBuilding, IconTarget, IconApps } from '@tabler/icons-react';
import { showSuccessToast, showErrorToast } from '~/utils/toast';
import { GitHubConnectionFlow } from '~/components/Integrations/GitHubConnectionFlow';
import type { AppLayoutLoaderData } from '~/routes/dashboard.$org';
import type { SystemMetadataBackend } from '~/types/system-metadata';

type PlatformTargetPair = { platform: string; target: string };

export default function OnboardingPage() {
  const theme = useMantineTheme();
  const params = useParams<{ org: string }>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const appId = params.org!;
  const orgData = useRouteLoaderData<AppLayoutLoaderData>('routes/dashboard.$org');
  const dashboardData = useRouteLoaderData<{ initialSystemMetadata: SystemMetadataBackend | null }>('routes/dashboard');

  const app = orgData?.app;
  const setupStatus = orgData?.setupStatus;
  const systemMetadata = dashboardData?.initialSystemMetadata;

  const [activeStep, setActiveStep] = useState<number>(() => {
    const step = typeof setupStatus?.step === 'number' ? setupStatus.step : 2;
    return Math.max(1, Math.min(4, step));
  });
  console.log('activeStep', activeStep);

  const [appName, setAppName] = useState(app?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [platformTargets, setPlatformTargets] = useState<PlatformTargetPair[]>(() =>
    Array.isArray(orgData?.platformTargets) ? orgData.platformTargets : []
  );
  const [savingTargets, setSavingTargets] = useState(false);

  const platforms = useMemo(
    () => systemMetadata?.releaseManagement?.platforms ?? [],
    [systemMetadata]
  );
  const targets = useMemo(
    () => systemMetadata?.releaseManagement?.targets ?? [],
    [systemMetadata]
  );

  const togglePair = (platform: string, target: string) => {
    setPlatformTargets((prev) => {
      const exists = prev.some((pt) => pt.platform === platform && pt.target === target);
      if (exists) {
        return prev.filter((pt) => !(pt.platform === platform && pt.target === target));
      }
      return [...prev, { platform, target }];
    });
  };

  const isPairSelected = (platform: string, target: string) =>
    platformTargets.some((pt) => pt.platform === platform && pt.target === target);

  const handleSaveName = async () => {
    if (!appName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/v1/apps/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: appName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update app name');
      showSuccessToast({ message: 'App name updated' });
    } catch (e) {
      showErrorToast({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to update' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePlatformTargets = async () => {
    if (platformTargets.length === 0) {
      showErrorToast({ title: 'Select at least one', message: 'Choose at least one platform and target.' });
      return;
    }
    setSavingTargets(true);
    try {
      const res = await fetch(`/api/v1/apps/${appId}/platform-targets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platformTargets }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? data?.message ?? 'Failed to save');
      }
      showSuccessToast({ message: 'Platform targets saved' });
      revalidator.revalidate();
      setActiveStep(4);
    } catch (e) {
      showErrorToast({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setSavingTargets(false);
    }
  };

  const handleStep4Done = () => {
    navigate(`/dashboard/${appId}/releases`);
  };

  if (!app) {
    return (
      <Container size="sm" py="xl">
        <Text c="dimmed">App not found.</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Text fw={600} size="lg" mb="md">
        Set up your app
      </Text>
      <Stepper
        active={activeStep - 1}
        onStepClick={(index) => setActiveStep(index + 1)}
        allowNextStepsSelect={false}
        size="sm"
        mb="xl"
      >
        <Stepper.Step label="App name" description="Edit app name" icon={<IconBuilding size={18} />}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="App name"
                placeholder="Enter app name"
                value={appName}
                onChange={(e) => setAppName(e.currentTarget.value)}
                size="md"
              />
              <Button onClick={handleSaveName} loading={savingName} size="sm">
                Save name
              </Button>
              <Group>
                <Button variant="light" onClick={() => setActiveStep(2)}>
                  Next: Connect repository
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="Repository" description="Connect SCM" icon={<IconBrandGithub size={18} />}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Connect a source control repository so we can track releases and trigger workflows.
              </Text>
              <GitHubConnectionFlow
                onConnect={() => {
                  showSuccessToast({ message: 'Repository connected' });
                  revalidator.revalidate();
                  setActiveStep(3);
                }}
                onCancel={() => setActiveStep(1)}
              />
              <Group>
                <Button variant="light" onClick={() => setActiveStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setActiveStep(3)}>Next: Platform targets</Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="Platforms & targets" description="Select distribution" icon={<IconTarget size={18} />}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Choose which platforms and distribution targets this app will use (e.g. Android + Play Store, iOS + App Store, Over-the-Air).
              </Text>
              <Box>
                {platforms.map((platform) => (
                  <Box key={platform.id} mb="md">
                    <Text size="sm" fw={600} mb="xs">
                      {platform.name}
                    </Text>
                    <Group gap="md">
                      {(platform.applicableTargets ?? []).map((targetId) => {
                        const target = targets.find((t) => t.id === targetId);
                        if (!target) return null;
                        return (
                          <Checkbox
                            key={`${platform.id}-${targetId}`}
                            label={target.name}
                            checked={isPairSelected(platform.id, targetId)}
                            onChange={() => togglePair(platform.id, targetId)}
                          />
                        );
                      })}
                    </Group>
                  </Box>
                ))}
              </Box>
              <Group>
                <Button variant="light" onClick={() => setActiveStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSavePlatformTargets}
                  loading={savingTargets}
                  disabled={platformTargets.length === 0}
                >
                  Save and continue
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="Stores (optional)" description="Connect stores" icon={<IconApps size={18} />}>
          <Paper p="lg" radius="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Optionally connect Play Store and App Store for distribution. You can do this later from Integrations.
              </Text>
              <Button
                component={Link}
                to={`/dashboard/${appId}/integrations`}
                variant="light"
                leftSection={<IconApps size={18} />}
              >
                Open Integrations
              </Button>
              <Group>
                <Button variant="light" onClick={() => setActiveStep(3)}>
                  Back
                </Button>
                <Button variant="default" onClick={handleStep4Done}>
                  Skip
                </Button>
                <Button onClick={handleStep4Done}>Done</Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>
    </Container>
  );
}
