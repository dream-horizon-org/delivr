import {
  Box,
  Text,
  Title,
  Group,
  SimpleGrid,
  Paper,
  Badge,
  Stack,
  ThemeIcon,
  Container,
  Button,
  useMantineTheme,
} from "@mantine/core";
import { CTAButton } from "~/components/Common/CTAButton";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import {
  IconRocket,
  IconCloud,
  IconShieldCheck,
  IconBolt,
  IconDevices,
  IconRefresh,
  IconCheck,
} from "@tabler/icons-react";

const features = [
  {
    icon: IconRocket,
    title: "Instant OTA Updates",
    description: "Push updates instantly without app store delays.",
  },
  {
    icon: IconCloud,
    title: "Cloud Native",
    description: "Built for scale with enterprise-grade reliability.",
  },
  {
    icon: IconShieldCheck,
    title: "Secure by Design",
    description: "End-to-end encryption with code signing.",
  },
  {
    icon: IconDevices,
    title: "Cross Platform",
    description: "Support for React Native, Flutter, and native apps.",
  },
  {
    icon: IconBolt,
    title: "Delta Updates",
    description: "Smart patching for minimal bandwidth usage.",
  },
  {
    icon: IconRefresh,
    title: "Instant Rollback",
    description: "One-click rollback to any previous version.",
  },
];

export function Intro() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  return (
    <Box bg="white" minH="100vh">
      {/* Navbar placeholder style */}
      <Box borderBottom={`1px solid ${theme.colors.slate[2]}`} py="md">
        <Container size="xl">
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon size="lg" color="brand" variant="light" radius="md">
                <IconRocket size={20} />
              </ThemeIcon>
              <Text fw={700} size="lg" c="slate.9">Delivr</Text>
            </Group>
            <Group>
               <Button variant="subtle" size="sm" color="slate">Documentation</Button>
               <Button variant="subtle" size="sm" color="slate">Support</Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Container size="md" py={100}>
        <Stack align="center" gap="xl" mb={80}>
          <Badge 
            variant="light" 
            color="brand" 
            size="lg" 
            radius="md" 
            tt="none"
            fw={600}
          >
            v2.0 is now available
          </Badge>
          
          <Title 
            order={1} 
            ta="center" 
            style={{ 
              fontSize: 64, 
              fontWeight: 800, 
              letterSpacing: '-2px',
              lineHeight: 1.1,
              color: theme.colors.slate[9],
            }}
          >
            The modern way to ship <br />
            mobile updates.
          </Title>
          
          <Text size="xl" c="slate.5" ta="center" maw={560} lh={1.6}>
            Deploy over-the-air updates to your React Native and mobile apps instantly. Bypass app store reviews and ship faster.
          </Text>

          <Group mt="md">
            <CTAButton
              size="lg"
              variant="filled"
              onClick={() => navigate(route("/dashboard/create-org"))}
            >
              Start Deploying
            </CTAButton>
            <Button 
              variant="default" // Secondary
              size="lg"
              fw={600}
              c="slate.9"
            >
              Read the docs
            </Button>
          </Group>

          <Group gap="xl" mt="md" c="slate.5">
            <Group gap={6}>
              <IconCheck size={18} color={theme.colors.brand[5]} />
              <Text size="sm" fw={500}>No credit card required</Text>
            </Group>
            <Group gap={6}>
              <IconCheck size={18} color={theme.colors.brand[5]} />
              <Text size="sm" fw={500}>14-day free trial</Text>
            </Group>
          </Group>
        </Stack>
      </Container>

      {/* Grid */}
      <Box bg="slate.0" py={100} style={{ borderTop: `1px solid ${theme.colors.slate[2]}` }}>
        <Container size="lg">
          <Stack align="center" mb={60}>
            <Title order={2} c="slate.9" fw={700}>Everything you need</Title>
            <Text c="slate.5" size="lg">Powerful features for modern development teams</Text>
          </Stack>
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={40}>
            {features.map((feature, i) => (
              <Box key={i}>
                <ThemeIcon 
                  variant="light" 
                  size="xl" 
                  radius="md" 
                  mb="md" 
                  color="brand"
                  style={{ width: 48, height: 48 }}
                >
                  <feature.icon size={24} stroke={1.5} />
                </ThemeIcon>
                <Text fw={600} size="lg" c="slate.9" mb="xs">{feature.title}</Text>
                <Text size="md" c="slate.5" lh={1.6}>{feature.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}
