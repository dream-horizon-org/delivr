import { Box, Button, Group, Tabs, rem, useMantineTheme } from "@mantine/core";
import { IconRocket, IconKey, IconUsers, IconList, IconUserPlus } from "@tabler/icons-react";
import { CollabaratorList } from "~/components/Pages/components/CollaboratorList";
import { DeploymentList } from "~/components/Pages/DeploymentList";
import { useLoaderData, useParams, useNavigate } from "@remix-run/react";
import { User } from "~/.server/services/Auth/Auth.interface";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useState } from "react";
import { CreateDeploymentForm } from "~/components/Pages/components/CreateDeploymentForm";
import { useGetDeploymentsForApp } from "~/components/Pages/DeploymentList/hooks/getDeploymentsForApp";
import { CTAButton } from "~/components/Common/CTAButton";

export const loader = authenticateLoaderRequest();

export default function AppDetails() {
  const theme = useMantineTheme();
  const _user = useLoaderData<User>();
  const params = useParams();
  const navigate = useNavigate();
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("deployments");

  const { refetch: refetchDeployments } = useGetDeploymentsForApp();

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="pills"
          styles={{
            tab: {
              borderRadius: theme.radius.md,
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              transition: "all 0.15s ease",
              fontWeight: 500,
              "&[data-active]": {
                background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
                color: "white",
              },
              "&:hover:not([data-active])": {
                backgroundColor: theme.colors.slate[1],
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

        {activeTab === "deployments" && (
          <Group gap="sm">
            <Button
              leftSection={<IconKey size={18} />}
              onClick={() => setCreateDeploymentOpen(true)}
              variant="default"
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
              Create Deployment Key
            </Button>
            <CTAButton
              leftSection={<IconRocket size={18} />}
              onClick={() => {
                navigate(`/dashboard/${params.org}/${params.app}/create-release`);
              }}
            >
              Create Release
            </CTAButton>
          </Group>
        )}

        {activeTab === "collaborators" && (
          <CTAButton
            leftSection={<IconUserPlus size={18} />}
            onClick={() => setAddCollaboratorOpen(true)}
          >
            Add Collaborator
          </CTAButton>
        )}
      </Group>

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
