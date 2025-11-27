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
import { CTAButton } from "~/components/CTAButton";
import { useState } from "react";
import { CreateAppForm } from "../CreateApp";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
import { Button } from "@mantine/core";
import { useDeleteAppForOrg } from "../DeleteAction/hooks/useDeleteAppForOrg";

type DeleteAppState = {
  id: string;
  name: string;
} | null;

type AppListPageProps = {
  user: User;
};

export function AppListPage({ user }: AppListPageProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const navigate = useNavigate();
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [deleteAppState, setDeleteAppState] = useState<DeleteAppState>(null);
  const { mutate: deleteApp, isLoading: isDeleting } = useDeleteAppForOrg();

  const { data, isLoading, isError, refetch } = useGetAppListForOrg({
    orgId: params.org ?? "",
    userEmail: user.user.email,
  });

  const { data: orgs = [] } = useGetOrgList();
  const currentOrg = orgs.find((org) => org.id === params.org);

  if (isLoading) {
    return (
      <Box>
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
      </Box>
    );
  }

  if (isError) {
    return (
      <Box>
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
        </Group>
        <Text c="red" ta="center" p="xl">
          Something went wrong while loading apps!
        </Text>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box>
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
            onClick={() => navigate(route("/dashboard/create/app"))}
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
      </Box>
    );
  }

  return (
    <Box>
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
              setDeleteAppState({ id: app.id, name: app.name });
            }}
          />
        ))}
      </Flex>

      {/* Create App Modal */}
      <Modal
        opened={createAppOpen}
        onClose={() => setCreateAppOpen(false)}
        title="Create App"
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
      {deleteAppState && (
        <Modal
          opened={true}
          onClose={() => setDeleteAppState(null)}
          title="Delete App"
          centered
        >
          <Text>
            Are you sure you want to delete this app ({deleteAppState.name})?
          </Text>
          <Group justify="flex-end" mt="lg">
            <Button
              variant="default"
              onClick={() => setDeleteAppState(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={isDeleting}
              onClick={() => {
                deleteApp(
                  {
                    tenant: params.org ?? "",
                    appId: deleteAppState.id,
                  },
                  {
                    onSuccess: () => {
                      actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
                      setDeleteAppState(null);
                      refetch();
                    },
                  }
                );
              }}
            >
              Delete
            </Button>
          </Group>
        </Modal>
      )}
    </Box>
  );
}

