import { 
  Box, 
  Container, 
  Stack, 
  Text, 
  Title, 
  Group, 
  Paper, 
  Alert,
  ThemeIcon,
  SimpleGrid,
  useMantineTheme
} from "@mantine/core";
import { 
  IconAlertCircle,
  IconRocket,
  IconSettings,
  IconGitBranch,
  IconChecklist
} from "@tabler/icons-react";
import { useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import { GoogleButton } from "~/components/Common/GoogleButton";
import { theme as customTheme } from "~/theme/colors";
import logoImage from "~/assets/images/delivr-logo.svg";

type LoginProps = {
  onClickLogin: () => void;
  error?: string | null;
};

const features = [
  {
    icon: IconRocket,
    title: "Release Management",
    description: "Orchestrate releases from kickoff to app store submission",
  },
  {
    icon: IconSettings,
    title: "Automated Workflows",
    description: "Configure build pipelines, testing, and deployment stages",
  },
  {
    icon: IconGitBranch,
    title: "OTA Updates",
    description: "Push JavaScript and asset updates to React Native apps",
  },
  {
    icon: IconChecklist,
    title: "Quality Control",
    description: "Regression testing, approvals, and staged rollouts",
  },
];

export function LoginForm({ onClickLogin, error }: LoginProps) {
  const theme = useMantineTheme();
  const [searchParams] = useSearchParams();
  
  // Use state to persist session expired status even after URL cleanup
  const [isSessionExpired, setIsSessionExpired] = useState(
    searchParams.get('sessionExpired') === 'true'
  );
  
  // Clean up URL after component mounts (remove query parameter from URL bar)
  useEffect(() => {
    if (searchParams.get('sessionExpired') === 'true') {
      setIsSessionExpired(true);
      // Clean up URL but keep the message visible
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  return (
    <Box style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left Side - Brand Showcase (50%) */}
      <Box
        style={{
          width: "50%",
          background: `linear-gradient(135deg, ${customTheme.brand.primary} 0%, ${customTheme.brand.quaternary} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
          position: "relative",
          overflow: "hidden",
        }}
        visibleFrom="md"
      >
        {/* Abstract Background Illustration */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <style>{`
            @keyframes float1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(20px, -30px) scale(1.05); }
            }
            @keyframes float2 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-25px, 25px) scale(1.03); }
            }
            @keyframes float3 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(15px, 20px) scale(1.02); }
            }
            @keyframes float4 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-20px, -15px) scale(1.04); }
            }
            @keyframes float5 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(10px, -20px) scale(1.01); }
            }
            .bubble-1 {
              animation: float1 20s ease-in-out infinite;
            }
            .bubble-2 {
              animation: float2 25s ease-in-out infinite;
            }
            .bubble-3 {
              animation: float3 18s ease-in-out infinite;
            }
            .bubble-4 {
              animation: float4 22s ease-in-out infinite;
            }
            .bubble-5 {
              animation: float5 24s ease-in-out infinite;
            }
          `}</style>
          
          {/* Large circle - top right */}
          <Box
            className="bubble-1"
            style={{
              position: "absolute",
              top: "-15%",
              right: "-10%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              border: "3px solid rgba(255, 255, 255, 0.25)",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            }}
          />
          
          {/* Medium circle - bottom left */}
          <Box
            className="bubble-2"
            style={{
              position: "absolute",
              bottom: "-12%",
              left: "-8%",
              width: "350px",
              height: "350px",
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
            }}
          />
          
          {/* Small circle - top left corner */}
          <Box
            className="bubble-3"
            style={{
              position: "absolute",
              top: "15%",
              left: "5%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "2px solid rgba(255, 255, 255, 0.18)",
            }}
          />
          
          {/* Small circle - bottom right */}
          <Box
            className="bubble-4"
            style={{
              position: "absolute",
              bottom: "20%",
              right: "8%",
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              border: "2px solid rgba(255, 255, 255, 0.16)",
            }}
          />
          
          {/* Small circle - top center */}
          <Box
            className="bubble-5"
            style={{
              position: "absolute",
              top: "8%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          />
        </Box>

        <Container size="md" style={{ zIndex: 1, position: "relative" }}>
          <Stack gap="xl">
            {/* Logo/Brand */}
            <Box>
              <Group gap="sm" align="center" style={{ marginBottom: theme.spacing.xs }}>
              <img 
                  src={logoImage} 
                  alt="Delivr Logo" 
                  style={{ 
                    height: "56px", 
                    width: "56px",
                    display: "block",
                    objectFit: "contain"
                  }} 
                />
              <Title
                  order={1}
                  size="3rem"
                  fw={800}
                  c="white"
                  style={{ margin: 0 }}
                >
                  Delivr
                </Title>

                
              </Group>
              <Text size="xl" c="white" fw={500} opacity={0.95} style={{ marginLeft: theme.spacing.sm }}>
                Release management platform for mobile apps
              </Text>
            </Box>

            {/* Subheadline */}
            <Box>
            {/* <Text size="lg" c="white" opacity={0.9} style={{ maxWidth: "700px" }}>
              Streamline your release process from kickoff through regression testing to app store distribution.
            </Text> */}

            {/* Features Grid */}
            <SimpleGrid cols={2} spacing="lg" mt="xl">
              {features.map((feature, index) => (
                <Box key={index}>
                  <Group gap="md" align="flex-start">
                    <ThemeIcon
                      size="xl"
                      radius="md"
                      variant="light"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <feature.icon size={24} stroke={2} />
                    </ThemeIcon>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={600} size="md" c="white">
                        {feature.title}
                      </Text>
                      <Text size="sm" c="white" opacity={0.85}>
                        {feature.description}
                      </Text>
                    </Stack>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
            </Box>
          </Stack>
        </Container>

        {/* Decorative background elements */}
        <Box
          style={{
            position: "absolute",
            top: "-50%",
            right: "-20%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            filter: "blur(60px)",
          }}
        />
        <Box
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-10%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            filter: "blur(60px)",
          }}
        />
      </Box>

      {/* Right Side - Login Form (50%) */}
      <Box
        style={{
          width: "50%",
          backgroundColor: customTheme.backgrounds.app,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.xl,
        }}
        visibleFrom="md"
      >
      <Paper
          radius="lg"
          p="xl"
          shadow="lg"
          style={{
            width: "100%",
            maxWidth: "420px",
            backgroundColor: customTheme.backgrounds.paper,
          }}
        >
          <Stack gap="lg" align="stretch">
            {/* Header */}
            <Stack gap={4} align="center">
              <Title order={2} size="1.25rem" fw={600} c={customTheme.text.heading}>
                Welcome Back
              </Title>
              <Text size="xs" c={customTheme.text.secondary} ta="center">
                Sign in to continue
              </Text>
            </Stack>

            {/* Error Alert */}
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Authentication Error"
                color="red"
                variant="light"
                radius="md"
              >
                {error}
              </Alert>
            )}

            {/* Google Login Button */}
            <Group grow>
              <GoogleButton
        radius="md"
                fullWidth
                size="md"
                onClick={onClickLogin}
                style={{
                  backgroundColor: "white",
                  color: customTheme.text.heading,
                  border: `1px solid ${customTheme.borders.subtle}`,
                  fontWeight: 500,
                }}
              >
                Continue with Google
              </GoogleButton>
            </Group>

            {/* Footer Text */}
            <Text size="xs" c={customTheme.text.muted} ta="center" mt="xs">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Stack>
        </Paper>

        {/* Session Expired Error Message - Below Login Form */}
        {isSessionExpired && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Session Expired"
            color="red"
            variant="light"
            radius="md"
            mt="md"
            style={{
              width: "100%",
              maxWidth: "420px",
            }}
          >
            Your session has expired. Please log in again.
          </Alert>
        )}
      </Box>

      {/* Mobile View - Stacked Layout */}
      <Box
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        hiddenFrom="md"
      >
        {/* Mobile Header - Brand Section */}
        <Box
          style={{
            background: `linear-gradient(135deg, ${customTheme.brand.primary} 0%, ${customTheme.brand.quaternary} 100%)`,
            padding: theme.spacing.xl,
            paddingTop: `calc(${theme.spacing.xl} * 2)`,
          }}
        >
          <Stack gap="md" align="center">
            <Box style={{ marginBottom: theme.spacing.sm }}>
              <img 
                src={logoImage} 
                alt="Delivr Logo" 
                style={{ 
                  height: "64px", 
                  width: "64px",
                  display: "block",
                  objectFit: "contain"
                }} 
              />
            </Box>
            <Title order={1} size="2rem" fw={800} c="white" ta="center">
              Delivr
            </Title>
            <Text size="sm" c="white" opacity={0.95} ta="center">
              Release management platform for mobile apps
            </Text>
          </Stack>
        </Box>

        {/* Mobile Login Form */}
        <Box
          style={{
            flex: 1,
            backgroundColor: customTheme.backgrounds.app,
            padding: theme.spacing.xl,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Paper
            radius="lg"
            p="xl"
            shadow="md"
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: customTheme.backgrounds.paper,
            }}
          >
            <Stack gap="lg" align="stretch">
              <Stack gap={4} align="center">
                <Title order={2} size="1.25rem" fw={500} c={customTheme.text.heading}>
                  Welcome back
                </Title>
                <Text size="xs" c={customTheme.text.secondary} ta="center">
                  Sign in to continue
          </Text>
              </Stack>
          
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Authentication Error"
              color="red"
              variant="light"
                  radius="md"
            >
              {error}
            </Alert>
          )}
          
              <Group grow>
                <GoogleButton
                  radius="md"
                  fullWidth
                  size="md"
                  onClick={onClickLogin}
                  style={{
                    backgroundColor: "white",
                    color: customTheme.text.heading,
                    border: `1px solid ${customTheme.borders.subtle}`,
                    fontWeight: 500,
                  }}
                >
              Continue with Google
            </GoogleButton>
          </Group>

              <Text size="xs" c={customTheme.text.muted} ta="center" mt="xs">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
        </Stack>
      </Paper>

          {/* Session Expired Error Message - Below Login Form (Mobile) */}
          {isSessionExpired && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Session Expired"
              color="red"
              variant="light"
              radius="md"
              mt="md"
              style={{
                width: "100%",
                maxWidth: "400px",
              }}
            >
              Your session has expired. Please log in again.
            </Alert>
          )}
        </Box>
      </Box>
    </Box>
  );
}
