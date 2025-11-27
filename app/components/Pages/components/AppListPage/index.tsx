import {
  Title,
  Text,
  Paper,
  Group,
  Skeleton,
  Box,
  Flex,
  useMantineTheme,
  Modal,
} from "@mantine/core";
import { IconPlus, IconChevronRight } from "@tabler/icons-react";
import { useNavigate, useParams } from "@remix-run/react";
import { route } from "routes-gen";
import { User } from "~/.server/services/Auth/Auth.interface";
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

  // Render content based on state
  let content;

  if (isLoading) {
    content = (
      <>
        <Group justify="space-between" align="center" mb="xl">
          <Skeleton height={40} width={250} />
          <Skeleton height={40} width={200} />
        </Group>
        <Flex gap="lg" wrap="wrap">
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} width={250} height={250} radius="md" />
            ))}
        </Flex>
      </>
    );
  } else if (isError) {
    content = (
      <>
        <Group justify="space-between" align="center" mb="lg">
          <Group gap="xs" align="center">
            <Text size="md" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.primary}>
              {currentOrg?.orgName || "Organization"}
            </Text>
            <IconChevronRight size={theme.other.sizes.icon.md} color={theme.other.text.tertiary} />
            <Text size="md" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.primary}>
              Applications
            </Text>
          </Group>
          <CTAButton
            leftSection={<IconPlus size={theme.other.sizes.icon.lg} />}
            onClick={() => setCreateAppOpen(true)}
            styles={{
              root: {
                boxShadow: theme.other.shadows.md,
              },
            }}
          >
            Create App
          </CTAButton>
        </Group>
        <Text c="red" ta="center" p="xl">
          Something went wrong while loading apps!
        </Text>
      </>
    );
  } else if (!data || data.length === 0) {
    content = (
      <>
        <Group justify="space-between" align="center" mb="lg">
          <Group gap="xs" align="center">
            <Text size="md" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.primary}>
              {currentOrg?.orgName || "Organization"}
            </Text>
            <IconChevronRight size={theme.other.sizes.icon.md} color={theme.other.text.tertiary} />
            <Text size="md" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.primary}>
              Applications
            </Text>
          </Group>
          <CTAButton
            leftSection={<IconPlus size={theme.other.sizes.icon.lg} />}
            onClick={() => setCreateAppOpen(true)}
            styles={{
              root: {
                boxShadow: theme.other.shadows.md,
              },
            }}
          >
            Create App
          </CTAButton>
        </Group>
        <Paper withBorder p="xl" radius="md">
          <Text c="dimmed" ta="center">
            No apps found. Create your first app to get started!
          </Text>
        </Paper>
      </>
    );
  } else {
    content = (
      <>
        <Group justify="space-between" align="center" mb="lg">
          <Group gap="xs" align="center">
            <Text 
              size="sm" 
              fw={theme.other.typography.fontWeight.medium} 
              c={theme.other.text.tertiary}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(route("/dashboard"))}
            >
              {currentOrg?.orgName || "Organization"}
            </Text>
            <IconChevronRight size={theme.other.sizes.icon.sm} color={theme.other.text.tertiary} />
            <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.primary}>
              Applications
            </Text>
          </Group>
          
          <CTAButton
            leftSection={<IconPlus size={theme.other.sizes.icon.lg} />}
            onClick={() => setCreateAppOpen(true)}
          >
            Create App
          </CTAButton>
        </Group>

        <Flex gap="lg" wrap="wrap">
          {data.map((app) => (
            <AppListRow
              key={app.id}
              app={app}
              onNavigate={() => {
                navigate(
                  route("/dashboard/:org/:app", {
                    org: params.org ?? "",
                    app: app.id,
                  })
                );
              }}
              onDelete={() => {
                setDeleteModalData({
                  type: 'app',
                  appId: app.id,
                  appName: app.name,
                  tenant: params.org ?? '',
                });
              }}
            />
          ))}
        </Flex>
      </>
    );
  }

  return (
    <Box>
      {content}

      {/* Create App Modal - Always rendered */}
      <Modal
        opened={createAppOpen}
        onClose={() => setCreateAppOpen(false)}
        title="Create Application"
        centered
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

