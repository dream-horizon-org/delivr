import {
  Box,
  Text,
  Title,
  Container,
  Stack,
  ThemeIcon,
  useMantineTheme,
  Paper,
  Group,
} from "@mantine/core";
import { IconBuildingSkyscraper, IconCheck } from "@tabler/icons-react";
import { CreateAppModal } from "~/components/Pages/components/AppsPage/components/CreateAppModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";

export default function GettingStartedPage() {
  const theme = useMantineTheme();

  const handleAppCreated = () => {
    // Trigger app list refetch so sidebar app list updates
    actions.trigger(ACTION_EVENTS.REFETCH_ORGS); // Keep event name for backward compatibility
    // Do not navigate here: CreateAppModal already navigates to /dashboard/:appId/onboarding
  };

  return (
    <Box bg="white" mih="100vh">
      {/* Main Content - Header is already provided by parent layout */}
      <Container size="sm" py={80}>
        <Stack gap="xl" align="center">
          {/* Hero Section */}
          <Stack align="center" gap="md" mb="xl">
            <ThemeIcon 
              size={80} 
              radius="xl" 
              variant="light" 
              color="brand"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.brand[0]} 0%, ${theme.colors.brand[1]} 100%)`,
              }}
            >
              <IconBuildingSkyscraper size={40} stroke={1.5} />
            </ThemeIcon>
            
            <Title 
              order={1} 
              ta="center"
              style={{
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: '-1px',
                lineHeight: 1.2,
                color: theme.colors.slate[9],
              }}
            >
              Let's Get Started
            </Title>
            
            <Text size="lg" c="slate.5" ta="center" maw={480} lh={1.6}>
              Create your first app to start deploying updates to your mobile apps.
            </Text>
          </Stack>

          {/* App Creation Form */}
          <Paper 
            w="100%" 
            p="xl" 
            radius="lg" 
            withBorder
            style={{
              borderColor: theme.colors.slate[2],
              background: 'white',
            }}
          >
            <CreateAppModal onSuccess={handleAppCreated} />
          </Paper>

        </Stack>
      </Container>
    </Box>
  );
}
