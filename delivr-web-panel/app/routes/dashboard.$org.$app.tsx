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
import { CTAButton } from "~/components/CTAButton";

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

  const iconStyle = { width: rem(theme.other.sizes.icon.md), height: rem(theme.other.sizes.icon.md) };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Tabs 
          value={activeTab} 
          onChange={setActiveTab}
          variant="pills"
          styles={{
            tab: {
              borderRadius: theme.other.borderRadius.md,
              padding: `${theme.other.spacing.sm} ${theme.other.spacing.lg}`,
              transition: theme.other.transitions.fast,
              "&[data-active]": {
                background: theme.other.brand.gradient,
                color: theme.other.text.white,
              },
              "&:hover": {
                backgroundColor: theme.other.backgrounds.hover,
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
              leftSection={<IconKey size={theme.other.sizes.icon.lg} />}
              onClick={() => setCreateDeploymentOpen(true)}
              variant="default"
              styles={{
                root: {
                  borderColor: theme.other.borders.primary,
                  "&:hover": {
                    background: theme.other.backgrounds.subtle,
                    borderColor: theme.other.brand.primary,
                  },
                },
              }}
            >
              Create Deployment Key
            </Button>
            <CTAButton
              leftSection={<IconRocket size={theme.other.sizes.icon.lg} />}
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
            leftSection={<IconUserPlus size={theme.other.sizes.icon.lg} />}
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
