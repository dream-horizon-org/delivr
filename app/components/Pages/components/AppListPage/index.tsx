import {
  Title,
  Text,
  Paper,
  Group,
  Skeleton,
  Box,
  SimpleGrid,
  useMantineTheme,
  Modal,
  Stack,
  Center,
  ThemeIcon,
  Badge,
  Button,
} from "@mantine/core";
import {
  IconPlus,
  IconApps,
  IconRocket,
  IconCloud,
  IconDeviceMobile,
  IconRefresh,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "@remix-run/react";
import { route } from "routes-gen";
import { User } from '~/.server/services/Auth/auth.interface';
import { useGetAppListForOrg } from "../AppList/hooks/useGetAppListForOrg";
import { AppListRow } from "./components/AppListRow";
import { useGetOrgList } from "../OrgListNavbar/hooks/useGetOrgList";
import { CTAButton } from "~/components/Common/CTAButton";
import { useState } from "react";
import { CreateAppForm } from "../CreateApp";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

type AppListPageProps = {
  user: User;
};

// Constants for consistent spacing
const HEADER_PY = 24;
const HEADER_PX = 32;
const CONTENT_PY = 32;
const CONTENT_PX = 32;

export function AppListPage({ user }: AppListPageProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const navigate = useNavigate();
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);

  const { data, isLoading, isError, refetch } = useGetAppListForOrg({
    orgId: params.org ?? "",
    userEmail: user.user.email,
  });

  const { data: orgs = [] } = useGetOrgList();
  const currentOrg = orgs.find((org) => org.id === params.org);

  const bgColor = theme.colors.slate[0];

  // Page Header Component
  const PageHeader = ({ showButton = true }: { showButton?: boolean }) => (
    <Box
      style={{
        background: "#ffffff",
        borderBottom: `1px solid ${theme.colors.slate[2]}`,
      }}
    >
      <Box px={HEADER_PX} py={HEADER_PY}>
        <Group justify="space-between" align="center">
          <Box>
            <Group gap="xs" mb={4}>
              <Text size="lg" fw={600} c={theme.colors.slate[9]}>
                Applications
              </Text>
              {data && data.length > 0 && (
                <Badge
                  size="sm"
                  variant="light"
                  color="gray"
                  radius="sm"
                  style={{
                    textTransform: "none",
                    background: theme.colors.slate[1],
                    color: theme.colors.slate[6],
                  }}
                >
                  {data.length}
                </Badge>
              )}
            </Group>
            <Text size="sm" c={theme.colors.slate[5]}>
              Manage OTA updates for your mobile applications
            </Text>
          </Box>

          {showButton && (
            <CTAButton
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateAppOpen(true)}
              size="sm"
            >
              Create App
            </CTAButton>
          )}
        </Group>
      </Box>
    </Box>
  );

  // Loading State
  if (isLoading) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: "100%" }}>
        <Box
          style={{
            background: "#ffffff",
            borderBottom: `1px solid ${theme.colors.slate[2]}`,
          }}
          py={HEADER_PY}
          px={HEADER_PX}
        >
          <Skeleton height={28} width={200} mb="xs" />
          <Skeleton height={16} width={300} />
        </Box>
        <Box p={CONTENT_PY} px={CONTENT_PX}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} height={220} radius="md" />
              ))}
          </SimpleGrid>
        </Box>
      </Box>
    );
  }

  // Error State
  if (isError) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: "100%" }}>
        <PageHeader showButton={false} />
        <Center style={{ minHeight: "calc(100vh - 200px)" }} p={CONTENT_PY} px={CONTENT_PX}>
          <Stack align="center" gap="lg">
            <ThemeIcon size={80} radius="xl" color="red" variant="light">
              <IconAlertCircle size={40} />
            </ThemeIcon>
            <Stack align="center" gap="xs">
              <Text fw={600} size="xl" c={theme.colors.slate[9]}>
                Failed to load applications
              </Text>
              <Text size="sm" c={theme.colors.slate[5]} ta="center" maw={400}>
                We couldn&apos;t fetch your applications. Please check your connection and try again.
              </Text>
            </Stack>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={() => refetch()}
              variant="default"
              size="md"
            >
              Try Again
            </Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  // Empty State
  if (!data || data.length === 0) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: "100%" }}>
        <PageHeader showButton={false} />
        <Center style={{ minHeight: "calc(100vh - 200px)" }} p={CONTENT_PY} px={CONTENT_PX}>
          <Stack align="center" gap="xl" maw={500}>
            {/* Illustration */}
            <Box
              style={{
                width: 120,
                height: 120,
                borderRadius: theme.radius.xl,
                background: `linear-gradient(135deg, ${theme.colors.brand[0]} 0%, ${theme.colors.brand[1]} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <IconApps size={56} color={theme.colors.brand[5]} stroke={1.5} />
              {/* Decorative elements */}
              <Box
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.md,
                  background: theme.colors.brand[5],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconPlus size={18} color="white" />
              </Box>
            </Box>

            {/* Text Content */}
            <Stack align="center" gap="xs">
              <Text fw={700} size="xl" c={theme.colors.slate[9]}>
                Create your first application
              </Text>
              <Text size="md" c={theme.colors.slate[5]} ta="center" lh={1.6}>
                Applications are containers for your OTA updates. Create one to start
                delivering updates to your mobile users instantly.
              </Text>
            </Stack>

            {/* CTA Button */}
            <CTAButton
              leftSection={<IconPlus size={18} />}
              onClick={() => setCreateAppOpen(true)}
              size="lg"
            >
              Create Application
            </CTAButton>

            {/* Feature highlights */}
            <SimpleGrid cols={3} spacing="xl" mt="lg">
              <Stack align="center" gap="xs">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="brand"
                >
                  <IconRocket size={18} />
                </ThemeIcon>
                <Text size="xs" c={theme.colors.slate[6]} ta="center" fw={500}>
                  Instant Updates
                </Text>
              </Stack>
              <Stack align="center" gap="xs">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="brand"
                >
                  <IconCloud size={18} />
                </ThemeIcon>
                <Text size="xs" c={theme.colors.slate[6]} ta="center" fw={500}>
                  Cloud Hosted
                </Text>
              </Stack>
              <Stack align="center" gap="xs">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="brand"
                >
                  <IconDeviceMobile size={18} />
                </ThemeIcon>
                <Text size="xs" c={theme.colors.slate[6]} ta="center" fw={500}>
                  Cross Platform
                </Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Center>

        {/* Modal */}
        <Modal
          opened={createAppOpen}
          onClose={() => setCreateAppOpen(false)}
          title={
            <Text fw={600} size="md" c={theme.colors.slate[9]}>
              Create Application
            </Text>
          }
          centered
          size="md"
        >
          <CreateAppForm
            onSuccess={() => {
              setCreateAppOpen(false);
              refetch();
            }}
          />
        </Modal>
      </Box>
    );
  }

  // Apps List State
  return (
    <Box style={{ backgroundColor: bgColor, minHeight: "100%" }}>
      <PageHeader />

      <Box p={CONTENT_PY} px={CONTENT_PX}>
        <SimpleGrid
          cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 }}
          spacing="lg"
          verticalSpacing="lg"
        >
          {data.map((app) => (
            <AppListRow
              key={app.id}
              app={app}
              onNavigate={() => {
                navigate(
                  route("/dashboard/:org/ota/:app", {
                    org: params.org ?? "",
                    app: app.id,
                  })
                );
              }}
              onDelete={() => {
                setDeleteModalData({
                  type: "app",
                  appId: app.id,
                  appName: app.name,
                  tenant: params.org ?? "",
                });
              }}
            />
          ))}
        </SimpleGrid>
      </Box>

      {/* Create App Modal */}
      <Modal
        opened={createAppOpen}
        onClose={() => setCreateAppOpen(false)}
        title={
          <Text fw={600} size="md" c={theme.colors.slate[9]}>
            Create Application
          </Text>
        }
        centered
        size="md"
      >
        <CreateAppForm
          onSuccess={() => {
            setCreateAppOpen(false);
            refetch();
          }}
        />
      </Modal>

      {/* Delete App Modal */}
      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => {
          actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
          refetch();
        }}
      />
    </Box>
  );
}

