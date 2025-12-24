import { Box, Button, Group, Tabs, rem, useMantineTheme, Text } from "@mantine/core";
import { IconRocket, IconKey, IconUsers, IconList, IconUserPlus, IconChevronRight } from "@tabler/icons-react";
import { CollabaratorList } from "~/components/Pages/components/CollaboratorList";
import { DeploymentList } from "~/components/Pages/DeploymentList";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { User } from '~/.server/services/Auth/auth.interface';
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useState } from "react";
import { CreateDeploymentForm } from "~/components/Pages/components/CreateDeploymentForm";
import { useGetDeploymentsForApp } from "~/components/Pages/DeploymentList/hooks/getDeploymentsForApp";
import { CTAButton } from "~/components/Common/CTAButton";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import { useGetAppListForOrg } from "~/components/Pages/components/AppList/hooks/useGetAppListForOrg";

export const loader = authenticateLoaderRequest();

export default function AppDetails() {
  const theme = useMantineTheme();
  const user = useLoaderData<User>();
  const params = useParams();
  const navigate = useNavigate();
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("deployments");

  const { refetch: refetchDeployments } = useGetDeploymentsForApp();
  const { data: orgs = [] } = useGetOrgList();
  const { data: apps = [] } = useGetAppListForOrg({
    orgId: params.org ?? "",
    userEmail: user.user.email,
  });

  const currentOrg = orgs.find((org) => org.id === params.org);
  const currentApp = apps.find((app) => app.id === params.app);

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Box>
      {/* Page Header with Breadcrumb */}
      <Box mb={20}>
        {/* Breadcrumb */}
        <Group gap={6} mb={6}>
          <Text
            size="sm"
            c={theme.colors.slate[5]}
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          >
            {currentOrg?.orgName || "Organization"}
          </Text>
          <IconChevronRight size={14} color={theme.colors.slate[4]} />
          <Text
            size="sm"
            c={theme.colors.slate[5]}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/dashboard/${params.org}/apps`)}
          >
            Applications
          </Text>
          <IconChevronRight size={14} color={theme.colors.slate[4]} />
          <Text size="sm" fw={500} c={theme.colors.slate[8]}>
            {currentApp?.name || "App"}
          </Text>
        </Group>

        {/* Title and Actions */}
        <Group justify="space-between" align="center">
          <Text size="xl" fw={700} c={theme.colors.slate[9]}>
            {currentApp?.name || "Application"}
          </Text>

          <Group gap="sm">
            {activeTab === "deployments" && (
              <>
                <Button
                  leftSection={<IconKey size={16} />}
                  onClick={() => setCreateDeploymentOpen(true)}
                  variant="default"
                  size="sm"
                  styles={{
                    root: {
                      borderColor: theme.colors.slate[3],
                      "&:hover": {
                        background: theme.colors.slate[1],
                        borderColor: theme.colors.brand[5],
                      },
                    },
                  }}
                >
                  New Deployment Key
                </Button>
                <CTAButton
                  leftSection={<IconRocket size={16} />}
                  size="sm"
                  onClick={() => {
                    navigate(`/dashboard/${params.org}/${params.app}/create-release`);
                  }}
                >
                  Create Release
                </CTAButton>
              </>
            )}

            {activeTab === "collaborators" && (
              <CTAButton
                leftSection={<IconUserPlus size={16} />}
                size="sm"
                onClick={() => setAddCollaboratorOpen(true)}
              >
                Add Collaborator
              </CTAButton>
            )}
          </Group>
        </Group>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        variant="pills"
        styles={{
          root: {
            marginBottom: 24,
          },
          list: {
            gap: 4,
            background: theme.colors.slate[1],
            padding: 4,
            borderRadius: theme.radius.md,
            width: "fit-content",
          },
          tab: {
            borderRadius: theme.radius.sm,
            padding: "8px 16px",
            transition: "all 0.15s ease",
            fontWeight: 500,
            fontSize: 14,
            color: theme.colors.slate[6],
            "&[data-active]": {
              color: "#ffffff",
              background: theme.colors.brand[5],
            },
            "&:hover:not([data-active])": {
              background: theme.colors.slate[2],
              color: theme.colors.slate[8],
            },
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="deployments" leftSection={<IconList style={iconStyle} />}>
            Releases
          </Tabs.Tab>
          <Tabs.Tab value="collaborators" leftSection={<IconUsers style={iconStyle} />}>
            Collaborators
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Content */}
      {activeTab === "deployments" && <DeploymentList />}
      {activeTab === "collaborators" && (
        <CollabaratorList
          addCollaboratorOpen={addCollaboratorOpen}
          setAddCollaboratorOpen={setAddCollaboratorOpen}
        />
      )}

      {/* Create Deployment Modal */}
      <CreateDeploymentForm
        open={createDeploymentOpen}
        onClose={() => {
          setCreateDeploymentOpen(false);
          refetchDeployments();
        }}
      />
    </Box>
  );
}
