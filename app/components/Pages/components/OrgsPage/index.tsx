import {
  Title,
  Text,
  Skeleton,
  Box,
  SimpleGrid,
  Stack,
  Center,
  Group,
  Modal,
  Paper,
  Badge,
  Button,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import { 
  IconPlus, 
  IconRocket, 
  IconBuildingSkyscraper,
  IconChartBar,
  IconCloud,
  IconTerminal2,
  IconGitBranch,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useGetOrgList } from "../OrgListNavbar/hooks/useGetOrgList";
import { OrgCard } from "./components/OrgCard";
import { Intro } from "../../Intro";
import { CTAButton } from "~/components/Common/CTAButton";
import { useState, useEffect } from "react";
import { CreateOrgModal } from "./components/CreateOrgModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

// Vibrant Feature Card
function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  tag,
  color,
  gradient
}: { 
  icon: React.ElementType;
  title: string;
  description: string;
  tag: string;
  color: string;
  gradient: string;
}) {
  return (
    <Paper
      p="xl"
      radius="md"
      style={{
        background: `linear-gradient(145deg, #fff 0%, ${gradient} 100%)`,
        border: '1px solid rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
      }}
      styles={{
        root: {
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
            borderColor: 'rgba(0,0,0,0.08)',
          },
        },
      }}
    >
      <Group justify="space-between" mb="lg" align="flex-start">
        <Box
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Icon size={22} color="white" stroke={2} />
        </Box>
        <Badge 
          size="sm" 
          variant="light" 
          color="gray"
          bg="white"
          radius="sm"
          fw={700}
          c="dimmed"
          style={{ border: '1px solid rgba(0,0,0,0.05)' }}
        >
          {tag}
        </Badge>
      </Group>
      
      <Text fw={700} size="lg" c="dark.9" mb={8} style={{ letterSpacing: '-0.01em' }}>
        {title}
      </Text>
      
      <Text size="sm" c="dimmed" lh={1.6}>
        {description}
      </Text>
    </Paper>
  );
}

export function OrgsPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetOrgList();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);

  useEffect(() => {
    const handleRefetch = () => refetch();
    actions.add(ACTION_EVENTS.REFETCH_ORGS, handleRefetch);
  }, [refetch]);

  if (!isLoading && !isError && (!data || data.length === 0)) {
    return <Intro />;
  }

  // Safe color access
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const bgColor = theme.colors?.slate?.[0] || '#f8fafc';

  if (isLoading) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
        <Box 
          style={{ 
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: 'white',
          }} 
          py="xl" 
          px={32}
        >
          <Skeleton height={32} width={240} mb="sm" />
          <Skeleton height={20} width={400} />
        </Box>
        <Box py={48} px={32}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="lg">
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} height={200} radius="md" />
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
        <Center minH={500}>
          <Stack align="center" gap="lg">
            <ThemeIcon size={56} radius="md" color="red" variant="light">
              <IconBuildingSkyscraper size={28} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={700} size="lg" c="dark.9">Unable to load organizations</Text>
              <Text c="dimmed">There was a problem connecting to the server.</Text>
            </Stack>
            <Button onClick={() => refetch()} variant="default">Try Again</Button>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
      {/* Header - Spacious & Clean */}
      <Box
        style={{
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: 'white',
        }}
      >
        <Box py={32} px={40}>
          <Group justify="space-between" align="flex-start">
            <Stack gap={8}>
              <Group gap="sm">
                <Title order={2} c="dark.9" fw={800} style={{ letterSpacing: '-0.02em' }}>
                  Organizations
                </Title>
                <Badge 
                  size="md" 
                  variant="light" 
                  color="gray" 
                  radius="sm"
                  c="dimmed"
                  fw={600}
                >
                  {data?.length || 0}
                </Badge>
              </Group>
              <Text size="md" c="dimmed">
                Manage your workspaces, apps, and OTA deployments.
              </Text>
            </Stack>
            
            <CTAButton
              leftSection={<IconPlus size={18} />}
              onClick={() => setCreateOrgOpen(true)}
              size="md"
              variant="filled" // Primary
            >
              New Organization
            </CTAButton>
          </Group>
        </Box>
      </Box>

      {/* Main Content - Full Width Fluid */}
      <Box py={48} px={40}>
        
        {/* Organizations Grid */}
        <Box mb={80}>
          <SimpleGrid 
            cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 }} 
            spacing={24}
            verticalSpacing={24}
          >
            {data?.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                onNavigate={() => {
                  navigate(route("/dashboard/:org/apps", { org: org.id }));
                }}
                onDelete={() => {
                  setDeleteModalData({
                    type: 'org',
                    orgId: org.id,
                    orgName: org.orgName,
                  });
                }}
              />
            ))}
          </SimpleGrid>
        </Box>

        {/* Roadmap / Features Section - Vibrant & Exciting */}
        <Box>
          <Group mb="xl" align="center" gap="sm">
             <IconSparkles size={20} color={theme.colors?.brand?.[5] || '#14b8a6'} fill="currentColor" style={{ opacity: 0.2 }} />
             <Title order={3} c="dark.9" fw={800} style={{ letterSpacing: '-0.02em' }}>
              Platform Roadmap
             </Title>
             <Badge variant="light" color="brand" radius="sm">COMING SOON</Badge>
          </Group>
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4, xl: 4 }} spacing={24}>
            <FeatureCard
              icon={IconTerminal2}
              title="CLI Integration"
              description="Deploy and manage releases directly from your CI pipeline."
              tag="DEV TOOLS"
              color="#0f172a" // Slate 900
              gradient="#f8fafc" // Very subtle
            />
            <FeatureCard
              icon={IconGitBranch}
              title="Advanced Rollouts"
              description="Percentage-based rollouts and staged releases."
              tag="RELEASE"
              color="#0d9488" // Brand Teal
              gradient="#f0fdfa" // Teal Fade
            />
            <FeatureCard
              icon={IconChartBar}
              title="Crash Analytics"
              description="Real-time stability monitoring and reporting."
              tag="OBSERVABILITY"
              color="#6366f1" // Indigo
              gradient="#eef2ff" // Indigo Fade
            />
            <FeatureCard
              icon={IconCloud}
              title="Multi-region"
              description="Global edge caching for faster update delivery."
              tag="INFRA"
              color="#0ea5e9" // Sky Blue
              gradient="#f0f9ff" // Sky Fade
            />
          </SimpleGrid>
        </Box>
      </Box>

      {/* Modals */}
      <Modal
        opened={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title={<Text fw={600} size="md">Create New Organization</Text>}
        centered
        size="md"
        padding="lg"
        overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
      >
        <CreateOrgModal
          onSuccess={() => {
            actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
            setCreateOrgOpen(false);
          }}
        />
      </Modal>

      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => refetch()}
      />
    </Box>
  );
}
