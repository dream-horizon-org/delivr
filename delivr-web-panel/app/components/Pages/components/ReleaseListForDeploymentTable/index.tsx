import { useEffect } from "react";
import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  Box,
  Progress,
  Skeleton,
  Grid,
  ThemeIcon,
  RingProgress,
  Divider,
  Paper,
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconRocket,
  IconDevices,
  IconDownload,
  IconAlertTriangle,
  IconCalendar,
  IconCheck,
  IconTrendingUp,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useGetReleaseListForDeployment } from "./hooks/useGetReleaseListForDeployment";
import { useParams, useSearchParams, useNavigate } from "@remix-run/react";
import { ReleaseListResponse } from "./data/getReleaseListForDeployment";

// Format file size
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Format relative time
const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
};

// Calculate success rate
const getSuccessRate = (installed: number, failed: number) => {
  const total = installed + failed;
  if (total === 0) return 100;
  return Math.round((installed / total) * 100);
};

function ReleaseCard({
  release,
  onClick,
}: {
  release: ReleaseListResponse;
  onClick: () => void;
}) {
  const theme = useMantineTheme();
  const isActive = release.status;

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      style={{
        cursor: "pointer",
        transition: theme.other.transitions.normal,
        background: isActive
          ? `linear-gradient(135deg, rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, 0.03) 0%, rgba(${parseInt(theme.other.brand.secondary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.secondary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.secondary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.other.backgrounds.primary,
        borderLeft: isActive ? `4px solid ${theme.other.brand.primary}` : `1px solid ${theme.other.borders.secondary}`,
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.other.shadows.lg,
            borderColor: theme.other.brand.primary,
          },
        },
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" style={{ flex: 1 }}>
          <Box
            style={{
              width: theme.other.sizes.icon["4xl"],
              height: theme.other.sizes.icon["4xl"],
              borderRadius: theme.other.borderRadius.md,
              background: isActive
                ? theme.other.brand.gradient
                : `linear-gradient(135deg, ${theme.other.borders.secondary} 0%, ${theme.other.borders.light} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isActive ? theme.other.shadows.md : "none",
              flexShrink: 0,
            }}
          >
            <IconRocket size={theme.other.sizes.icon.xl} color={theme.other.text.white} />
          </Box>
          
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Text size="lg" fw={700} style={{ lineHeight: 1.2 }}>
                {release.label}
              </Text>
              {isActive ? (
                <Badge
                  variant="light"
                  color="green"
                  size="sm"
                  leftSection={<IconCheck size={10} />}
                >
                  Active
                </Badge>
              ) : (
                <Badge
                  variant="light"
                  color="gray"
                  size="sm"
                >
                  Inactive
                </Badge>
              )}
              {release.mandatory && (
                <Badge
                  variant="light"
                  color="red"
                  size="sm"
                  leftSection={<IconAlertTriangle size={10} />}
                >
                  Mandatory
                </Badge>
              )}
              {release.isBundlePatchingEnabled && (
                <Badge
                  variant="light"
                  color="blue"
                  size="sm"
                >
                  PatchBundle
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Target: {release.targetVersions} • {formatRelativeTime(release.releasedAt)}
            </Text>
          </Box>
        </Group>

        {/* Right: Rollout Progress */}
        <Group gap="md" wrap="nowrap">
          <Box style={{ minWidth: 200 }}>
            <Group justify="space-between" mb={6}>
              <Text size="xs" c="dimmed" fw={theme.other.typography.fontWeight.semibold}>
                Rollout
              </Text>
              <Text size="sm" fw={theme.other.typography.fontWeight.bold} style={{ color: theme.other.brand.primary }}>
                {release.rollout}%
              </Text>
            </Group>
            <Progress
              value={release.rollout}
              size="md"
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
          </Box>
          
          <Box style={{ textAlign: "center", minWidth: 80 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Devices
            </Text>
            <Text size="lg" fw={700} c="blue">
              {release.activeDevices?.toLocaleString() || 0}
            </Text>
          </Box>
        </Group>
      </Group>
    </Card>
  );
}

export function ReleaseListForDeploymentTable() {
  const theme = useMantineTheme();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading, refetch, isFetching, isError } =
    useGetReleaseListForDeployment({
      deploymentName: searchParams.get("deployment") ?? "",
      appId: params.app ?? "",
      tenant: params.org ?? "",
    });

  useEffect(() => {
    refetch();
  }, [searchParams.get("deployment")]);

  if (isLoading || isFetching) {
    return (
      <Stack gap="md" mt="xl">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Card withBorder padding="xl" radius="md" mt="xl" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center">
          <IconAlertCircle size={theme.other.sizes.avatar.md} color={theme.other.text.red} />
          <Title order={3} c="red">
            Something Went Wrong
          </Title>
          <Text c="dimmed">Unable to load releases. Please try again later.</Text>
        </Stack>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card withBorder padding="xl" radius="md" mt="xl" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center">
          <IconRocket size={48} color="#ccc" />
          <Title order={3} c="dimmed">
            No Releases Yet
          </Title>
          <Text c="dimmed">
            This deployment Key doesn't have any releases. Create your first release to get started!
          </Text>
        </Stack>
      </Card>
    );
  }

  // Sort releases by release time - latest first
  const sortedReleases = [...data].sort((a, b) => {
    // Sort by releasedAt in descending order (latest first)
    return (b.releasedAt || 0) - (a.releasedAt || 0);
  });

  return (
    <Stack gap="md" mt="xl">
      {sortedReleases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          onClick={() => {
            navigate(
              `/dashboard/${params.org}/${params.app}/${release.label}?deployment=${searchParams.get("deployment")}`
            );
          }}
        />
      ))}
    </Stack>
  );
}
