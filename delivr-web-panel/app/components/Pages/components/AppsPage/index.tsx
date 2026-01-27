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
  IconBuildingSkyscraper,
  IconChartBar,
  IconCloud,
  IconTerminal2,
  IconGitBranch,
  IconBriefcase,
  IconRoute,
  IconRefresh,
} from "@tabler/icons-react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useGetAppList } from "../OrgListNavbar/hooks/useGetAppList";
import { AppCard } from "./components/AppCard";
import { Intro } from "../../Intro";
import { CTAButton } from "~/components/Common/CTAButton";
import { useState, useEffect } from "react";
import { CreateAppModal } from "./components/CreateAppModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

// Consistent spacing values
const HEADER_PY = 24;
const HEADER_PX = 32;
const CONTENT_PY = 32;
const CONTENT_PX = 32;

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
      p="lg"
      radius="md"
      style={{
        background: `linear-gradient(145deg, #fff 0%, ${gradient} 100%)`,
        border: '1px solid rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
      }}
      styles={{
        root: {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.1)',
          },
        },
      }}
    >
      <Group justify="space-between" mb="md" align="flex-start">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          <Icon size={20} color="white" stroke={2} />
        </Box>
        <Badge 
          size="xs" 
          variant="light" 
          color="gray"
          bg="white"
          radius="sm"
          fw={600}
          c="dimmed"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          {tag}
        </Badge>
      </Group>
      
      <Text fw={600} size="md" c="dark.9" mb={6}>
        {title}
      </Text>
      
      <Text size="sm" c="dimmed" lh={1.5}>
        {description}
      </Text>
    </Paper>
  );
}

export function AppsPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetAppList();
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);

  useEffect(() => {
    const handleRefetch = () => refetch();
    actions.add(ACTION_EVENTS.REFETCH_ORGS, handleRefetch); // Keep event name for backward compatibility
  }, [refetch]);

  // Theme colors
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const bgColor = theme.colors?.slate?.[0] || '#f8fafc';

  // Show intro page if no apps exist
  if (!isLoading && !isError && (!data || data.length === 0)) {
    return <Intro />;
  }

  // Loading State
  if (isLoading) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: '100%' }}>
        <Box py={CONTENT_PY} px={CONTENT_PX}>
          {/* Page Title Skeleton */}
          <Group justify="space-between" align="center" mb="xl">
            <Group gap="md">
              <Skeleton height={32} width={160} radius="sm" />
              <Skeleton height={24} width={32} radius="sm" />
            </Group>
            <Skeleton height={36} width={160} radius="md" />
          </Group>
          
          {/* Content Skeleton */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={20}>
            {Array(8).fill(0).map((_, i) => (
              <Skeleton key={i} height={160} radius="md" />
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    );
  }

  // Error State
  if (isError) {
    return (
      <Box style={{ backgroundColor: bgColor, minHeight: '100%' }}>
        <Box py={CONTENT_PY} px={CONTENT_PX}>
          {/* Page Title */}
          <Group justify="space-between" align="center" mb="xl">
            <Group gap="md">
              <Title order={2} c="dark.9" fw={700}>Apps</Title>
            </Group>
          </Group>
          
          {/* Error Content */}
          <Center py={120}>
            <Stack align="center" gap="lg">
              <ThemeIcon size={64} radius="md" color="red" variant="light">
                <IconBuildingSkyscraper size={32} />
              </ThemeIcon>
              <Stack gap={4} align="center">
                <Text fw={600} size="lg" c="dark.9">Unable to load apps</Text>
                <Text c="dimmed" size="sm">There was a problem connecting to the server.</Text>
              </Stack>
              <Button 
                onClick={() => refetch()} 
                variant="light"
                leftSection={<IconRefresh size={16} />}
              >
                Try Again
              </Button>
            </Stack>
          </Center>
        </Box>
      </Box>
    );
  }

  // Success State
  return (
    <Box style={{ backgroundColor: bgColor, minHeight: '100%' }}>
      {/* Page Title Section - Styled as content, not a duplicate header */}
      <Box py={CONTENT_PY} px={CONTENT_PX}>
        <Group justify="space-between" align="center" mb="xl">
          <Group gap="md">
          <IconBriefcase size={18} color={theme.colors?.brand?.[5] || '#14b8a6'} />
             <Title order={4} c="dark.8" fw={700}>
              Apps
             </Title>
             {data?.length > 6&& <Badge 
              size="lg" 
              variant="filled" 
              color="dark" 
              radius="sm"
              fw={600}
            >
              {data?.length || 0}
            </Badge>}
          </Group>
          
          <CTAButton
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateAppOpen(true)}
            size="sm"
          >
            New App
          </CTAButton>
        </Group>

        {/* Main Content */}
        
        {/* Apps Grid */}
        <Box mb={64}>
          <SimpleGrid 
            cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 4, xl: 5 }} 
            spacing={20}
            verticalSpacing={20}
          >
            {data?.map((app) => (
              <AppCard
                key={app.id}
                org={app} // org prop accepts both App and Organization types
                onNavigate={() => {
                  navigate(route("/dashboard/:org/releases", { org: app.id })); // Route param is still $org
                }}
                onDelete={() => {
                  setDeleteModalData({
                    type: 'org', // Keep type as 'org' for backward compatibility
                    orgId: app.id, // orgId is actually appId
                    orgName: app.displayName || app.name, // orgName is actually app displayName
                  });
                }}
              />
            ))}
          </SimpleGrid>
        </Box>

        {/* Roadmap Section */}
        <Box>
          <Group mb="lg" align="center" gap="sm">
             <IconRoute size={18} color={theme.colors?.brand?.[5] || '#14b8a6'} />
             <Title order={4} c="dark.8" fw={700}>
              Platform Roadmap
             </Title>
             <Badge variant="light" color="brand" radius="sm" size="sm">COMING SOON</Badge>
          </Group>
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={20}>
            <FeatureCard
              icon={IconTerminal2}
              title="CLI Integration"
              description="Deploy and manage releases directly from your CI pipeline."
              tag="DEV TOOLS"
              color="#0f172a"
              gradient="#f8fafc"
            />
            <FeatureCard
              icon={IconGitBranch}
              title="Advanced Rollouts"
              description="Percentage-based rollouts and staged releases."
              tag="RELEASE"
              color="#0d9488"
              gradient="#f0fdfa"
            />
            <FeatureCard
              icon={IconChartBar}
              title="Crash Analytics"
              description="Real-time stability monitoring and reporting."
              tag="OBSERVABILITY"
              color="#6366f1"
              gradient="#eef2ff"
            />
            <FeatureCard
              icon={IconCloud}
              title="Multi-region"
              description="Global edge caching for faster update delivery."
              tag="INFRA"
              color="#0ea5e9"
              gradient="#f0f9ff"
            />
          </SimpleGrid>
        </Box>
      </Box>

      {/* Create App Modal */}
      <Modal
        opened={createAppOpen}
        onClose={() => setCreateAppOpen(false)}
        title={<Text fw={600} size="md">Create App</Text>}
        centered
        size="sm"
        padding="lg"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
      >
        <CreateAppModal
          onSuccess={() => {
            actions.trigger(ACTION_EVENTS.REFETCH_ORGS); // Keep event name for backward compatibility
            setCreateAppOpen(false);
          }}
        />
      </Modal>

      {/* Delete Modal */}
      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => refetch()}
      />
    </Box>
  );
}
