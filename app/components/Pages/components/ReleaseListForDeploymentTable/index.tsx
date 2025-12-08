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
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconRocket,
  IconAlertTriangle,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useGetReleaseListForDeployment } from "./hooks/useGetReleaseListForDeployment";
import { useParams, useSearchParams, useNavigate } from "@remix-run/react";
import { ReleaseListResponse } from "./data/getReleaseListForDeployment";

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
        transition: "all 0.2s ease",
        background: isActive
          ? `linear-gradient(135deg, rgba(20, 184, 166, 0.03) 0%, rgba(45, 212, 191, 0.03) 100%)`
          : "#ffffff",
        borderLeft: isActive ? `4px solid ${theme.colors.brand[5]}` : `1px solid ${theme.colors.slate[2]}`,
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.shadows.lg,
            borderColor: theme.colors.brand[5],
          },
        },
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" style={{ flex: 1 }}>
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.radius.md,
              background: isActive
                ? `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`
                : `linear-gradient(135deg, ${theme.colors.slate[2]} 0%, ${theme.colors.slate[1]} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isActive ? theme.shadows.md : "none",
              flexShrink: 0,
            }}
          >
            <IconRocket size={24} color="white" />
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
              <Text size="xs" c="dimmed" fw={600}>
                Rollout
              </Text>
              <Text size="sm" fw={700} c={theme.colors.brand[6]}>
                {release.rollout}%
              </Text>
            </Group>
            <Progress
              value={release.rollout}
              size="md"
              radius="xl"
              color="brand"
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
          <IconAlertCircle size={48} color={theme.colors.red[5]} />
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
