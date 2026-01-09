import {
  Box,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  Badge,
  Progress,
  RingProgress,
  Button,
  ThemeIcon,
  Avatar,
  Skeleton,
  ActionIcon,
  useMantineTheme,
  SimpleGrid,
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
  IconRocket,
  IconRotate2,
  IconEdit,
  IconArrowUp,
  IconAlertTriangle,
  IconChevronRight,
} from "@tabler/icons-react";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useGetReleaseDataForDeployment } from "~/components/Pages/components/ReleaseDetailCard/hooks/useGetReleaseDataForDeployment";
import { formatDate } from "~/utils/formatDate";
import { ReleaseEditFormModal } from "~/components/Pages/components/ReleaseEditForm";
import { PromoteReleaseForm } from "~/components/Pages/components/PromoteReleaseForm";

export const loader = authenticateLoaderRequest();

// Calculate success rate
const getSuccessRate = (installed: number, failed: number = 0) => {
  const total = installed + failed;
  if (total === 0) return 100;
  return Math.round((installed / total) * 100);
};

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subtext: string; 
  color: string;
}) {
  const theme = useMantineTheme();
  const colorShades = theme.colors[color] || theme.colors.gray;
  
  return (
    <Box
      p="md"
      style={{
        background: colorShades[0],
        borderRadius: theme.radius.md,
        border: `1px solid ${colorShades[2]}`,
      }}
    >
      <Group gap="xs" mb="xs">
        <ThemeIcon size="sm" variant="light" color={color} radius="sm">
          <Icon size={14} />
        </ThemeIcon>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          {label}
        </Text>
      </Group>
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        {subtext}
      </Text>
    </Box>
  );
}

// Metric Ring Component
function MetricRing({ 
  value, 
  label, 
  title, 
  subtext, 
  color 
}: { 
  value: number; 
  label: string; 
  title: string; 
  subtext: string; 
  color: string;
}) {
  return (
    <Stack align="center" gap="sm">
      <RingProgress
        size={120}
        thickness={10}
        roundCaps
        sections={[{ value, color }]}
        label={
          <Stack gap={0} align="center">
            <Text size="lg" fw={700} c={color}>
              {value}%
            </Text>
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          </Stack>
        }
      />
      <Stack gap={2} align="center">
        <Text size="sm" fw={500}>
          {title}
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {subtext}
        </Text>
      </Stack>
    </Stack>
  );
}

export default function ReleaseDetailPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

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
        <Group gap="sm" mb="lg">
          <Skeleton height={36} width={36} radius="md" />
          <Skeleton height={28} width={150} />
        </Group>
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Skeleton height={140} radius="md" />
              <Skeleton height={100} radius="md" />
              <Skeleton height={200} radius="md" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Skeleton height={200} radius="md" />
              <Skeleton height={160} radius="md" />
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Card withBorder padding="xl" radius="md" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center" py="xl">
          <ThemeIcon size={60} radius="xl" color="red" variant="light">
            <IconAlertCircle size={30} />
          </ThemeIcon>
          <Box>
            <Text size="lg" fw={600} c={theme.colors.slate[8]} mb={4}>
              Failed to Load Release
            </Text>
            <Text size="sm" c="dimmed">
              Unable to load release details. Please try again later.
            </Text>
          </Box>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
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
      <Box mb="xl">
        {/* Breadcrumb */}
        <Group gap={6} mb={8}>
          <Text
            size="sm"
            c={theme.colors.slate[5]}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/dashboard/${params.org}/ota/${params.app}`)}
          >
            Releases
          </Text>
          <IconChevronRight size={14} color={theme.colors.slate[4]} />
          <Text size="sm" fw={500} c={theme.colors.slate[7]}>
            {data.label}
          </Text>
        </Group>

        {/* Title Row */}
        <Group justify="space-between" align="flex-start">
          <Group gap="md" align="center">
            <ActionIcon
              variant="light"
              size="lg"
              radius="md"
              color="gray"
              onClick={() => navigate(`/dashboard/${params.org}/ota/${params.app}`)}
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <Box>
              <Group gap="sm" align="center">
                <Text size="xl" fw={700} c={theme.colors.slate[9]}>
                  {data.label}
                </Text>
                <Badge
                  variant="light"
                  color={data.status ? "green" : "gray"}
                  size="md"
                  leftSection={data.status ? <IconCheck size={12} /> : <IconX size={12} />}
                >
                  {data.status ? "Active" : "Inactive"}
                </Badge>
                {data.mandatory && (
                  <Badge
                    variant="light"
                    color="orange"
                    size="md"
                    leftSection={<IconAlertTriangle size={12} />}
                  >
                    Mandatory
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed" mt={4} maw={500} lineClamp={2}>
                {data.description || "No description provided"}
              </Text>
            </Box>
          </Group>

          <Group gap="sm">
            <Button
              leftSection={<IconEdit size={16} />}
              variant="default"
              size="sm"
              onClick={() => setSearchParams((p) => { p.set("edit", "true"); return p; })}
            >
              Edit
            </Button>
            <Button
              leftSection={<IconArrowUp size={16} />}
              color="brand"
              size="sm"
              onClick={() => setSearchParams((p) => { p.set("promote", "true"); return p; })}
            >
              Promote
            </Button>
          </Group>
        </Group>
      </Box>

      <Grid gutter="lg">
        {/* Left Column - Main Stats */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {/* Overview Stats */}
            <Card withBorder padding="md" radius="md">
              <Text size="sm" fw={600} c={theme.colors.slate[7]} mb="md">
                Overview
              </Text>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <StatCard
                  icon={IconDevices}
                  label="Active Devices"
                  value={data.activeDevices?.toLocaleString() || 0}
                  subtext={`of ${data.totalActive?.toLocaleString() || 0} total`}
                  color="blue"
                />
                <StatCard
                  icon={IconDownload}
                  label="Downloads"
                  value={data.downloaded?.toLocaleString() || 0}
                  subtext="total downloads"
                  color="teal"
                />
                <StatCard
                  icon={IconCheck}
                  label="Installed"
                  value={data.installed?.toLocaleString() || 0}
                  subtext="successful installs"
                  color="green"
                />
                <StatCard
                  icon={IconAlertCircle}
                  label="Failed"
                  value={0}
                  subtext="installation failures"
                  color="red"
                />
              </SimpleGrid>
            </Card>

            {/* Rollout Progress */}
            <Card withBorder padding="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={600} c={theme.colors.slate[7]}>
                  Rollout Progress
                </Text>
                <Group gap={6}>
                  <Text size="sm" c="dimmed">Target:</Text>
                  <Text size="sm" fw={700} c={theme.colors.brand[6]}>
                    {data.rollout}%
                  </Text>
                </Group>
              </Group>
              <Progress
                value={data.rollout}
                size="lg"
                radius="xl"
                color="brand"
              />
              <Text size="xs" c="dimmed" mt="sm">
                This release is being rolled out to {data.rollout}% of your user base
              </Text>
            </Card>

            {/* Performance Metrics */}
            <Card withBorder padding="md" radius="md">
              <Text size="sm" fw={600} c={theme.colors.slate[7]} mb="lg">
                Performance Metrics
              </Text>
              <SimpleGrid cols={3} spacing="md">
                <MetricRing
                  value={adoptionPercentage}
                  label="Adoption"
                  title="Active Adoption Rate"
                  subtext={`${data.activeDevices?.toLocaleString() || 0} of ${data.totalActive?.toLocaleString() || 0} devices`}
                  color="teal"
                />
                <MetricRing
                  value={successRate}
                  label="Success"
                  title="Installation Success"
                  subtext={`${data.installed?.toLocaleString() || 0} successful, 0 failed`}
                  color="green"
                />
                <MetricRing
                  value={rollbackPercentage}
                  label="Rollback"
                  title="Rollback Rate"
                  subtext={`${data.rollbacks?.toLocaleString() || 0} from ${data.installed?.toLocaleString() || 0} installs`}
                  color="red"
                />
              </SimpleGrid>
            </Card>
          </Stack>
        </Grid.Col>

        {/* Right Column - Metadata */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {/* Release Info Card */}
            <Card withBorder padding="md" radius="md">
              <Text size="sm" fw={600} c={theme.colors.slate[7]} mb="md">
                Release Details
              </Text>
              
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Version</Text>
                  <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                    {data.targetVersions}
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Released</Text>
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>
                    {formatDate(data.releasedAt)}
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Author</Text>
                  <Group gap={6}>
                    <Avatar
                      name={data.releasedBy}
                      color="initials"
                      size={24}
                      radius="xl"
                    />
                    <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                      {data.releasedBy}
                    </Text>
                  </Group>
                </Group>

                {data.rollbacks > 0 && (
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">Rollbacks</Text>
                    <Badge size="sm" variant="light" color="orange">
                      {data.rollbacks}
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Card>

            {/* Quick Stats Card */}
            <Card withBorder padding="md" radius="md">
              <Text size="sm" fw={600} c={theme.colors.slate[7]} mb="md">
                Quick Stats
              </Text>

              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Group gap={6}>
                    <IconTrendingUp size={14} color={theme.colors.green[5]} />
                    <Text size="sm" c="dimmed">Success Rate</Text>
                  </Group>
                  <Text size="sm" fw={600} c={theme.colors.green[6]}>
                    {successRate}%
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Group gap={6}>
                    <IconDevices size={14} color={theme.colors.teal[5]} />
                    <Text size="sm" c="dimmed">Adoption</Text>
                  </Group>
                  <Text size="sm" fw={600} c={theme.colors.teal[6]}>
                    {adoptionPercentage}%
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Total Devices</Text>
                  <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                    {data.totalActive?.toLocaleString() || 0}
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">Method</Text>
                  <Badge size="sm" variant="light" color="gray">
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
