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
  useMantineTheme,
  ThemeIcon,
  Button,
} from "@mantine/core";
import {
  IconRocket,
  IconAlertTriangle,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
  IconChevronRight,
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
      padding="lg"
      radius="md"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: "#ffffff",
        borderColor: isActive ? theme.colors.brand[3] : theme.colors.slate[2],
        borderLeftWidth: isActive ? 3 : 1,
        borderLeftColor: isActive ? theme.colors.brand[5] : theme.colors.slate[2],
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.shadows.md,
            borderColor: theme.colors.brand[4],
          },
        },
      }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" style={{ flex: 1 }}>
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.md,
              background: isActive
                ? `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`
                : theme.colors.slate[1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconRocket size={22} color={isActive ? "white" : theme.colors.slate[5]} />
          </Box>

          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap" mb={4}>
              <Text size="md" fw={600} c={theme.colors.slate[8]}>
                {release.label}
              </Text>
              {isActive ? (
                <Badge
                  variant="light"
                  color="green"
                  size="xs"
                  leftSection={<IconCheck size={10} />}
                >
                  Active
                </Badge>
              ) : (
                <Badge variant="light" color="gray" size="xs">
                  Inactive
                </Badge>
              )}
              {release.mandatory && (
                <Badge
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<IconAlertTriangle size={10} />}
                >
                  Mandatory
                </Badge>
              )}
              {release.isBundlePatchingEnabled && (
                <Badge variant="light" color="blue" size="xs">
                  PatchBundle
                </Badge>
              )}
            </Group>
            <Text size="xs" c={theme.colors.slate[5]}>
              Target: {release.targetVersions} • {formatRelativeTime(release.releasedAt)}
            </Text>
          </Box>
        </Group>

        {/* Right: Stats */}
        <Group gap="xl" wrap="nowrap">
          <Box style={{ minWidth: 160 }}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c={theme.colors.slate[5]} fw={500}>
                Rollout
              </Text>
              <Text size="xs" fw={600} c={theme.colors.brand[6]}>
                {release.rollout}%
              </Text>
            </Group>
            <Progress
              value={release.rollout}
              size="sm"
              radius="xl"
              color="brand"
            />
          </Box>

          <Box style={{ textAlign: "right", minWidth: 70 }}>
            <Text size="xs" c={theme.colors.slate[5]} fw={500} mb={2}>
              Devices
            </Text>
            <Text size="md" fw={700} c={theme.colors.slate[8]}>
              {release.activeDevices?.toLocaleString() || 0}
            </Text>
          </Box>

          <IconChevronRight size={18} color={theme.colors.slate[4]} />
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

  // Section Header
  const SectionHeader = () => (
    <Group justify="space-between" align="center" mb="md">
      <Group gap="xs">
        <Text size="sm" fw={600} c={theme.colors.slate[7]}>
          Releases
        </Text>
        {data && data.length > 0 && (
          <Badge size="sm" variant="light" color="gray" radius="sm">
            {data.length}
          </Badge>
        )}
      </Group>
    </Group>
  );

  if (isLoading || isFetching) {
    return (
      <Box>
        <SectionHeader />
        <Stack gap="sm">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} height={76} radius="md" />
            ))}
        </Stack>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
        <SectionHeader />
        <Card
          withBorder
          padding="xl"
          radius="md"
          style={{
            textAlign: "center",
            backgroundColor: theme.colors.red[0],
            borderColor: theme.colors.red[2],
          }}
        >
          <Stack gap="md" align="center" py="md">
            <ThemeIcon size="xl" radius="xl" color="red" variant="light">
              <IconAlertCircle size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={600} c={theme.colors.slate[8]} mb={4}>
                Failed to Load Releases
              </Text>
              <Text size="sm" c={theme.colors.slate[6]}>
                Unable to fetch releases for this deployment. Please try again.
              </Text>
            </Box>
            <Button
              variant="light"
              color="red"
              size="sm"
              leftSection={<IconRefresh size={16} />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  if (!data?.length) {
    return (
      <Box>
        <SectionHeader />
        <Card
          withBorder
          padding="xl"
          radius="md"
          style={{
            textAlign: "center",
            backgroundColor: theme.colors.slate[0],
            borderColor: theme.colors.slate[2],
          }}
        >
          <Stack gap="md" align="center" py="md">
            <ThemeIcon size="xl" radius="xl" color="gray" variant="light">
              <IconRocket size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={600} c={theme.colors.slate[7]} mb={4}>
                No Releases Yet
              </Text>
              <Text size="sm" c={theme.colors.slate[5]}>
                This deployment doesn't have any releases. Create your first release to get started.
              </Text>
            </Box>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Sort releases by release time - latest first
  const sortedReleases = [...data].sort((a, b) => {
    return (b.releasedAt || 0) - (a.releasedAt || 0);
  });

  return (
    <Box>
      <SectionHeader />
      <Stack gap="sm">
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
    </Box>
  );
}
