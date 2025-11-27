import {
  Box,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Progress,
  RingProgress,
  Button,
  Divider,
  Paper,
  ThemeIcon,
  Avatar,
  Skeleton,
  ActionIcon,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconDevices,
  IconDownload,
  IconCheck,
  IconX,
  IconTrendingUp,
  IconAlertCircle,
  IconCalendar,
  IconUser,
  IconFileZip,
  IconRocket,
  IconRotate2,
  IconEdit,
  IconArrowUp,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useNavigate, useParams, useSearchParams, useLoaderData } from "@remix-run/react";
import { User } from "~/.server/services/Auth/Auth.interface";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useGetReleaseDataForDeployment } from "~/components/Pages/components/ReleaseDetailCard/hooks/useGetReleaseDataForDeployment";
import { formatDate } from "~/utils/formatDate";
import { ReleaseEditFormModal } from "~/components/Pages/components/ReleaseEditForm";
import { PromoteReleaseForm } from "~/components/Pages/components/PromoteReleaseForm";

export const loader = authenticateLoaderRequest();

// Format file size
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Calculate success rate
const getSuccessRate = (installed: number, failed: number = 0) => {
  const total = installed + failed;
  if (total === 0) return 100;
  return Math.round((installed / total) * 100);
};

export default function ReleaseDetailPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useLoaderData<User>();

  const { data, isError, isLoading, isFetching, refetch } =
    useGetReleaseDataForDeployment({
      label: params.release ?? "",
      deploymentName: searchParams.get("deployment") ?? "",
      appId: params.app ?? "",
      tenant: params.org ?? "",
    });

  if (isLoading || isFetching) {
    return (
      <Box>
        <Skeleton height={40} width={200} mb="xl" />
        <Grid gutter="lg">
          <Grid.Col span={8}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
          <Grid.Col span={4}>
            <Stack gap="md">
              <Skeleton height={180} radius="md" />
              <Skeleton height={180} radius="md" />
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Card withBorder padding="xl" radius="md" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center">
          <IconAlertCircle size={theme.other.sizes.avatar.md} color={theme.other.text.red} />
          <Title order={3} c="red">
            Failed to Load Release
          </Title>
          <Text c="dimmed">Unable to load release details. Please try again later.</Text>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </Stack>
      </Card>
    );
  }

  const adoptionPercentage =
    data.totalActive > 0 ? Math.floor((data.activeDevices / data.totalActive) * 100) : 0;
  const rollbackPercentage =
    data.installed > 0 ? Math.floor((data.rollbacks / data.installed) * 100) : 0;
  const successRate = getSuccessRate(data.installed || 0, 0);

  return (
    <Box>
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Group gap="md">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate(`/dashboard/${params.org}/${params.app}`)}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Box>
            <Group gap="xs">
              <Title order={2}>{data.label}</Title>
              <Badge
                variant="light"
                color={data.status ? "green" : "gray"}
                size="lg"
                leftSection={data.status ? <IconCheck size={14} /> : <IconX size={14} />}
              >
                {data.status ? "Active" : "Inactive"}
              </Badge>
              {data.mandatory && (
                <Badge
                  variant="light"
                  color="red"
                  size="lg"
                  leftSection={<IconAlertTriangle size={14} />}
                >
                  Mandatory
                </Badge>
              )}
              {data.isBundlePatchingEnabled && (
                <Badge
                  variant="light"
                  color="blue"
                  size="lg"
                >
                  PatchBundle
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed" mt={4}>
              {data.description || "No description provided"}
            </Text>
          </Box>
        </Group>

        <Group gap="sm">
          <Button
            leftSection={<IconEdit size={18} />}
            variant="light"
            onClick={() => setSearchParams((p) => { p.set("edit", "true"); return p; })}
          >
            Edit
          </Button>
          <Button
            leftSection={<IconArrowUp size={theme.other.sizes.icon.lg} />}
            variant="gradient"
            gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            onClick={() => setSearchParams((p) => { p.set("promote", "true"); return p; })}
          >
            Promote
          </Button>
        </Group>
      </Group>

      <Grid gutter="lg">
        {/* Left Column - Main Stats */}
        <Grid.Col span={8}>
          <Stack gap="lg">
            {/* Overview Stats */}
            <Card withBorder padding="lg" radius="md">
              <Title order={4} mb="md">
                Overview
              </Title>
              <Grid gutter="md">
                <Grid.Col span={3}>
                  <Paper p="md" radius="md" style={{ background: theme.other.backgrounds.blue, border: `1px solid ${theme.other.text.blue}` }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="blue" radius="xl">
                          <IconDevices size={theme.other.sizes.icon.lg} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                          Active Devices
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="blue">
                        {data.activeDevices?.toLocaleString() || 0}
                      </Text>
                      <Text size="xs" c="dimmed">
                        of {data.totalActive?.toLocaleString() || 0} total
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={3}>
                  <Paper p="md" radius="md" style={{ background: theme.other.backgrounds.green, border: `1px solid ${theme.other.text.green}` }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="teal" radius="xl">
                          <IconDownload size={theme.other.sizes.icon.lg} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                          Downloads
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="teal">
                        {data.downloaded?.toLocaleString() || 0}
                      </Text>
                      <Text size="xs" c="dimmed">
                        total downloads
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={3}>
                  <Paper p="md" radius="md" style={{ background: theme.other.backgrounds.lightGreen, border: `1px solid ${theme.other.text.lightGreen}` }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="green" radius="xl">
                          <IconCheck size={theme.other.sizes.icon.lg} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                          Installed
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="green">
                        {data.installed?.toLocaleString() || 0}
                      </Text>
                      <Text size="xs" c="dimmed">
                        successful installs
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={3}>
                  <Paper p="md" radius="md" style={{ background: theme.other.backgrounds.pink, border: `1px solid ${theme.other.text.pink}` }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <ThemeIcon size="md" variant="light" color="red" radius="xl">
                          <IconAlertCircle size={theme.other.sizes.icon.lg} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                          Failed
                        </Text>
                      </Group>
                      <Text size="xl" fw={700} c="red">
                        {0}
                      </Text>
                      <Text size="xs" c="dimmed">
                        installation failures
                      </Text>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* Rollout Progress */}
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <Title order={4}>Rollout Progress</Title>
                <Group gap="xs">
                  <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c="dimmed">
                    Target:
                  </Text>
                  <Text size="lg" fw={theme.other.typography.fontWeight.bold} style={{ color: theme.other.brand.primary }}>
                    {data.rollout}%
                  </Text>
                </Group>
              </Group>
              <Progress
                value={data.rollout}
                size="xl"
                radius="xl"
                styles={{
                  root: {
                    background: theme.other.borders.secondary,
                  },
                  section: {
                    background: `linear-gradient(90deg, ${theme.other.brand.primary} 0%, ${theme.other.brand.secondary} 100%)`,
                  },
                }}
              />
              <Text size="xs" c="dimmed" mt="md">
                This release is being rolled out to {data.rollout}% of your user base
              </Text>
            </Card>

            {/* Performance Metrics */}
            <Card withBorder padding="lg" radius="md">
              <Title order={4} mb="md">
                Performance Metrics
              </Title>
              <Grid gutter="lg">
                <Grid.Col span={4}>
                  <Stack align="center" gap="md">
                    <RingProgress
                      size={180}
                      thickness={16}
                      sections={[{ value: adoptionPercentage, color: theme.other.text.green }]}
                      label={
                        <Stack gap={0} align="center">
                          <Text size="xl" fw={700} c="teal">
                            {adoptionPercentage}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            Adoption
                          </Text>
                        </Stack>
                      }
                    />
                    <Stack gap={4} align="center">
                      <Text size="sm" fw={500}>
                        Active Adoption Rate
                      </Text>
                      <Text size="xs" c="dimmed">
                        {data.activeDevices?.toLocaleString()} of {data.totalActive?.toLocaleString()} devices
                      </Text>
                    </Stack>
                  </Stack>
                </Grid.Col>

                <Grid.Col span={4}>
                  <Stack align="center" gap="md">
                    <RingProgress
                      size={180}
                      thickness={16}
                      sections={[{ value: successRate, color: theme.other.text.lightGreen }]}
                      label={
                        <Stack gap={0} align="center">
                          <Text size="xl" fw={700} c="green">
                            {successRate}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            Success
                          </Text>
                        </Stack>
                      }
                    />
                    <Stack gap={4} align="center">
                      <Text size="sm" fw={500}>
                        Installation Success
                      </Text>
                      <Text size="xs" c="dimmed">
                        {data.installed?.toLocaleString()} successful, {0} failed
                      </Text>
                    </Stack>
                  </Stack>
                </Grid.Col>

                <Grid.Col span={4}>
                  <Stack align="center" gap="md">
                    <RingProgress
                      size={180}
                      thickness={16}
                      sections={[{ value: rollbackPercentage, color: theme.other.text.pink }]}
                      label={
                        <Stack gap={0} align="center">
                          <Text size="xl" fw={700} c="red">
                            {rollbackPercentage}%
                          </Text>
                          <Text size="xs" c="dimmed">
                            Rollback
                          </Text>
                        </Stack>
                      }
                    />
                    <Stack gap={4} align="center">
                      <Text size="sm" fw={500}>
                        Rollback Rate
                      </Text>
                      <Text size="xs" c="dimmed">
                        {data.rollbacks?.toLocaleString()} rollbacks from {data.installed?.toLocaleString()} installs
                      </Text>
                    </Stack>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Card>
          </Stack>
        </Grid.Col>

        {/* Right Column - Metadata & Actions */}
        <Grid.Col span={4}>
          <Stack gap="lg">
            {/* Release Info */}
            <Card withBorder padding="lg" radius="md">
              <Title order={4} mb="md">
                Release Information
              </Title>
              <Stack gap="md">
                <Box>
                  <Group gap="xs" mb={4}>
                    <IconRocket size={theme.other.sizes.icon.md} color={theme.other.brand.primary} />
                    <Text size="sm" c="dimmed" fw={600}>
                      Version
                    </Text>
                  </Group>
                  <Text size="md" fw={500}>
                    {data.targetVersions}
                  </Text>
                </Box>

                <Divider />

                <Box>
                  <Group gap="xs" mb={4}>
                    <IconCalendar size={theme.other.sizes.icon.md} color={theme.other.brand.primary} />
                    <Text size="sm" c="dimmed" fw={600}>
                      Released At
                    </Text>
                  </Group>
                  <Text size="md" fw={500}>
                    {formatDate(data.releasedAt)}
                  </Text>
                </Box>

                <Divider />

                <Box>
                  <Group gap="xs" mb={4}>
                    <IconUser size={theme.other.sizes.icon.md} color={theme.other.brand.primary} />
                    <Text size="sm" c="dimmed" fw={600}>
                      Released By
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Avatar
                      name={data.releasedBy}
                      color="initials"
                      size="sm"
                      radius="xl"
                    />
                    <Text size="sm" fw={500}>
                      {data.releasedBy}
                    </Text>
                  </Group>
                </Box>

                {false && (
                  <>
                    <Divider />
                    <Box>
                      <Group gap="xs" mb={4}>
                        <IconFileZip size={theme.other.sizes.icon.md} color={theme.other.brand.primary} />
                        <Text size="sm" c="dimmed" fw={600}>
                          Package Size
                        </Text>
                      </Group>
                      <Text size="md" fw={500}>
                        N/A
                      </Text>
                    </Box>
                  </>
                )}

                {data.rollbacks > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Group gap="xs" mb={4}>
                        <IconRotate2 size={theme.other.sizes.icon.md} color={theme.other.text.pink} />
                        <Text size="sm" c="dimmed" fw={600}>
                          Rollbacks
                        </Text>
                      </Group>
                      <Badge variant="light" color="orange" size="lg">
                        {data.rollbacks} rollbacks
                      </Badge>
                    </Box>
                  </>
                )}
              </Stack>
            </Card>

            {/* Quick Stats */}
            <Card withBorder padding="lg" radius="md">
              <Title order={4} mb="md">
                Quick Stats
              </Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Success Rate
                  </Text>
                  <Group gap="xs">
                    <IconTrendingUp size={theme.other.sizes.icon.md} color={theme.other.text.lightGreen} />
                    <Text size="sm" fw={700} c="green">
                      {successRate}%
                    </Text>
                  </Group>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Adoption
                  </Text>
                  <Text size="sm" fw={700} c="teal">
                    {adoptionPercentage}%
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Total Devices
                  </Text>
                  <Text size="sm" fw={700}>
                    {data.totalActive?.toLocaleString() || 0}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Method
                  </Text>
                  <Badge variant="light" size="sm">
                    Manual
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Modals */}
      <ReleaseEditFormModal data={data} refetch={refetch} />
      <PromoteReleaseForm release={data} refetch={refetch} />
    </Box>
  );
}

