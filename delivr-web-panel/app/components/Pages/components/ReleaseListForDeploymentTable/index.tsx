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
      padding="md"
      radius="md"
      style={{
        cursor: "pointer",
        transition: "all 0.15s ease",
        background: "#ffffff",
        borderColor: theme.colors.slate[2],
      }}
      styles={{
        root: {
          "&:hover": {
            boxShadow: theme.shadows.sm,
            borderColor: theme.colors.slate[3],
          },
        },
      }}
      onClick={onClick}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="lg">
        {/* Left: Icon + Info */}
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.radius.sm,
              background: isActive
                ? `linear-gradient(135deg, ${theme.colors.brand[4]} 0%, ${theme.colors.brand[5]} 100%)`
                : theme.colors.slate[1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconRocket size={18} color={isActive ? "white" : theme.colors.slate[4]} />
          </Box>

          <Box style={{ minWidth: 0 }}>
            <Group gap={8} wrap="nowrap" align="center">
              <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                {release.label}
              </Text>
              <Badge
                variant="light"
                color={isActive ? "green" : "gray"}
                size="xs"
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
              {release.mandatory && (
                <Badge variant="light" color="orange" size="xs">
                  Mandatory
                </Badge>
              )}
            </Group>
            <Text size="xs" c={theme.colors.slate[5]} mt={2}>
              Target: {release.targetVersions} • {formatRelativeTime(release.releasedAt)}
            </Text>
          </Box>
        </Group>

        {/* Right: Stats */}
        <Group gap="lg" wrap="nowrap" align="center">
          {/* Rollout */}
          <Box style={{ width: 140 }}>
            <Group justify="space-between" align="center" gap="xs" mb={4}>
              <Text size="xs" c={theme.colors.slate[5]}>
                Rollout
              </Text>
              <Text size="xs" fw={600} c={theme.colors.brand[6]}>
                {release.rollout}%
              </Text>
            </Group>
            <Progress
              value={release.rollout}
              size={6}
              radius="xl"
              color="brand"
            />
          </Box>

          {/* Devices */}
          <Box style={{ width: 60, textAlign: "center" }}>
            <Text size="xs" c={theme.colors.slate[5]} mb={2}>
              Devices
            </Text>
            <Text size="sm" fw={600} c={theme.colors.slate[8]}>
              {release.activeDevices?.toLocaleString() || 0}
            </Text>
          </Box>

          <IconChevronRight size={16} color={theme.colors.slate[3]} style={{ flexShrink: 0 }} />
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
                `/dashboard/${params.org}/ota/${params.app}/${release.label}?deployment=${searchParams.get("deployment")}`
              );
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
