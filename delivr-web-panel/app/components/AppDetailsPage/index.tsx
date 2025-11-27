import {
  ActionIcon,
  Button,
  Container,
  Flex,
  Group,
  Paper,
  rem,
  Stack,
  Tabs,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconPhoto,
  IconSettings,
  IconPlus,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "@remix-run/react";
import { route } from "routes-gen";
import { useState } from "react";
import { CollabaratorList } from "~/components/Pages/components/CollaboratorList";
import { DeploymentList } from "~/components/Pages/DeploymentList";
import { ReleaseModal } from "~/components/ReleaseModal";
import { CreateDeploymentForm } from "~/components/Pages/components/CreateDeploymentForm";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import classes from "./index.module.css";

export function AppDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const appName = params.app ?? "";
  const orgId = params.org ?? "";
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false);
  
  const { data: orgs } = useGetOrgList();
  const currentOrg = orgs?.find((org) => org.id === orgId);

  const handleBack = () => {
    navigate(route("/dashboard/:org/apps", { org: orgId }));
  };

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header Navigation */}
        <Flex justify="space-between" align="center" wrap="wrap" gap="md">
          {/* Left side: Back icon and Breadcrumb */}
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={handleBack}
              className={classes.backButton}
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
            
            <Group gap="xs" align="center">
              <Title order={3} className={classes.breadcrumbText}>
                {currentOrg?.orgName || orgId}
              </Title>
              <Title order={3} c="dimmed" fw={400}>
                /
              </Title>
              <Title order={3} className={classes.appTitle}>
                {appName}
              </Title>
            </Group>
          </Group>

          {/* Right side: Action buttons */}
          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={18} />}
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan", deg: 45 }}
              onClick={() => setCreateDeploymentOpen(true)}
              className={classes.createReleaseButton}
            >
              Create New Key
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              variant="gradient"
              gradient={{ from: "indigo", to: "cyan", deg: 45 }}
              onClick={() => setReleaseModalOpen(true)}
              className={classes.createReleaseButton}
            >
              Create Release
            </Button>
          </Group>
        </Flex>

        {/* Tabs Section */}
        <Paper p="lg" radius="lg" className={classes.tabsCard}>
          <Tabs defaultValue="Deployments" className={classes.tabs}>
            <Tabs.List className={classes.tabsList}>
              <Tabs.Tab
                value="Deployments"
                leftSection={<IconPhoto style={iconStyle} />}
                className={classes.tab}
              >
                Deployments
              </Tabs.Tab>
              <Tabs.Tab
                value="Collaborators"
                leftSection={<IconSettings style={iconStyle} />}
                className={classes.tab}
              >
                Collaborators
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="Deployments" mt="md">
              <DeploymentList />
            </Tabs.Panel>
            <Tabs.Panel value="Collaborators" mt="md">
              <CollabaratorList />
            </Tabs.Panel>
          </Tabs>
        </Paper>

        {/* Release Modal */}
        <ReleaseModal
          opened={releaseModalOpen}
          onClose={() => setReleaseModalOpen(false)}
        />

        {/* Create Deployment Modal */}
        <CreateDeploymentForm
          open={createDeploymentOpen}
          onClose={() => setCreateDeploymentOpen(false)}
        />
      </Stack>
    </Container>
  );
}

