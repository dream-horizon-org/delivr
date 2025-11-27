import {
  Title,
  Text,
  Skeleton,
  Box,
  Container,
  SimpleGrid,
  Stack,
  Center,
  useMantineTheme,
  Card,
  Badge,
  Group,
  Modal,
} from "@mantine/core";
import { IconPlus, IconCode, IconRocket } from "@tabler/icons-react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useGetOrgList } from "../OrgListNavbar/hooks/useGetOrgList";
import { OrgCard } from "./components/OrgCard";
import { Intro } from "../../Intro";
import { CTAButton } from "~/components/CTAButton";
import { useState, useEffect } from "react";
import { CreateOrgModal } from "./components/CreateOrgModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
import { useDeleteOrg } from "../DeleteAction/hooks/useDeleteOrg";
import { Button } from "@mantine/core";

type DeleteOrgState = {
  id: string;
  name: string;
} | null;

export function OrgsPage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetOrgList();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [deleteOrgState, setDeleteOrgState] = useState<DeleteOrgState>(null);
  const { mutate: deleteOrg, isLoading: isDeleting } = useDeleteOrg();

  // Listen for refetch events
  useEffect(() => {
    const handleRefetch = () => {
      refetch();
    };

    actions.add(ACTION_EVENTS.REFETCH_ORGS, handleRefetch);
  }, [refetch]);

  // Show intro page if no organizations exist
  if (!isLoading && !isError && (!data || data.length === 0)) {
    return <Intro />;
  }

  if (isLoading) {
    return (
      <Container size="xl">
        <Stack gap="xl" align="center">
          <Box style={{ textAlign: "center", width: "100%", marginTop: theme.other.spacing["4xl"] }}>
            <Skeleton height={48} width={300} mx="auto" mb="md" />
            <Skeleton height={24} width={500} mx="auto" mb="lg" />
            <Skeleton height={44} width={220} mx="auto" />
          </Box>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="xl" style={{ width: "100%" }}>
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <Skeleton key={index} height={280} radius="md" />
              ))}
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container size="xl">
        <Center style={{ minHeight: "400px" }}>
          <Stack gap="md" align="center">
            <Title order={2} c="gray.7">
              Organizations
            </Title>
            <Text c="red" size="lg">
              Something went wrong while loading organizations!
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Box style={{ marginTop: theme.other.spacing.xl, marginBottom: theme.other.spacing.md }}>
          <Badge
            size="lg"
            radius="md"
            variant="light"
            mb="md"
            style={{
              backgroundColor: theme.other.brand.light,
              color: theme.other.brand.primaryDark,
              fontSize: theme.other.typography.fontSize.sm,
              fontWeight: theme.other.typography.fontWeight.bold,
              letterSpacing: theme.other.typography.letterSpacing.wide,
              textTransform: "uppercase",
            }}
          >
            Over The Air Updates
          </Badge>
          
          <Group justify="space-between" align="center" mb="xs">
            <Title 
              order={3} 
              fw={theme.other.typography.fontWeight.semibold}
              c={theme.other.text.primary}
            >
              Organizations
            </Title>
            <CTAButton
              leftSection={<IconPlus size={theme.other.sizes.icon.lg} />}
              onClick={() => setCreateOrgOpen(true)}
            >
              Create Organization
            </CTAButton>
          </Group>
          
          <Text size="sm" c={theme.other.text.tertiary}>
            Manage over-the-air updates for your applications
          </Text>
        </Box>

        <Box>
          <SimpleGrid 
            cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} 
            spacing="xl"
            style={{ 
              maxWidth: "1400px",
              margin: "0 auto",
            }}
          >
            {data?.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                onNavigate={() => {
                  navigate(
                    route("/dashboard/:org/apps", {
                      org: org.id,
                    })
                  );
                }}
                onDelete={() => {
                  setDeleteOrgState({ id: org.id, name: org.orgName });
                }}
              />
            ))}
          </SimpleGrid>
        </Box>

        {/* Coming Soon Section */}
        <Box 
          style={{ 
            marginTop: theme.other.spacing["4xl"],
            padding: theme.other.spacing.xl,
            borderRadius: theme.other.borderRadius.lg,
            background: theme.other.backgrounds.secondary,
            border: `1px solid ${theme.other.borders.primary}`,
          }}
        >
          <Badge
            size="lg"
            radius="md"
            variant="gradient"
            gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            mb="sm"
            style={{
              fontSize: theme.other.typography.fontSize.sm,
              fontWeight: theme.other.typography.fontWeight.bold,
              letterSpacing: theme.other.typography.letterSpacing.wide,
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </Badge>
          <Title 
            order={3} 
            fw={theme.other.typography.fontWeight.semibold}
            mb="xs"
            c={theme.other.text.primary}
          >
            New Features In Development
          </Title>
          <Text size="sm" c={theme.other.text.tertiary} mb="md">
            Advanced build automation and release orchestration coming soon
          </Text>

          <SimpleGrid 
            cols={{ base: 1, sm: 2 }} 
            spacing="lg"
          >
            {/* Build Management Card */}
            <Card
              withBorder
              padding={0}
              radius="lg"
              style={{
                borderColor: theme.other.borders.brand,
                backgroundColor: theme.other.backgrounds.primary,
                overflow: "hidden",
                position: "relative",
                boxShadow: theme.other.shadows.md,
              }}
            >
              <Box
                style={{
                  background: `linear-gradient(135deg, ${theme.other.brand.primary}33 0%, ${theme.other.brand.secondary}33 100%)`,
                  padding: theme.other.spacing.lg,
                  height: "120px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Badge
                  variant="filled"
                  size="sm"
                  radius="sm"
                  style={{
                    textTransform: "uppercase",
                    fontSize: theme.other.typography.fontSize.xs,
                    fontWeight: theme.other.typography.fontWeight.semibold,
                    letterSpacing: theme.other.typography.letterSpacing.wide,
                    backgroundColor: theme.other.brand.primary,
                    color: theme.other.text.white,
                  }}
                >
                  Coming Soon
                </Badge>
              </Box>

              <Box
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "-40px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Box
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: theme.other.borderRadius.xl,
                    background: theme.other.backgrounds.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `4px solid ${theme.other.backgrounds.primary}`,
                    boxShadow: theme.other.shadows.lg,
                  }}
                >
                  <Box
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.other.borderRadius.lg,
                      background: `${theme.other.brand.primary}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCode 
                      size={theme.other.sizes.icon["3xl"]} 
                      color={theme.other.brand.primary}
                      stroke={1.5}
                    />
                  </Box>
                </Box>
              </Box>

              <Stack gap="xs" style={{ padding: theme.other.spacing.lg, paddingTop: theme.other.spacing.md }}>
                <Text
                  ta="center"
                  size="lg"
                  fw={theme.other.typography.fontWeight.semibold}
                  style={{
                    color: theme.other.text.primary,
                  }}
                >
                  Build Management
                </Text>

                <Text 
                  ta="center" 
                  size="sm" 
                  c="dimmed"
                  fw={theme.other.typography.fontWeight.medium}
                  style={{ minHeight: "60px" }}
                >
                  Automate your build pipeline with integrated CI/CD workflows and version control
                </Text>
              </Stack>
            </Card>

            {/* Release Management Card */}
            <Card
              withBorder
              padding={0}
              radius="lg"
              style={{
                borderColor: theme.other.borders.brand,
                backgroundColor: theme.other.backgrounds.primary,
                overflow: "hidden",
                position: "relative",
                boxShadow: theme.other.shadows.md,
              }}
            >
              <Box
                style={{
                  background: `linear-gradient(135deg, ${theme.other.brand.secondary}33 0%, ${theme.other.brand.tertiary}33 100%)`,
                  padding: theme.other.spacing.lg,
                  height: "120px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Badge
                  variant="filled"
                  size="sm"
                  radius="sm"
                  style={{
                    textTransform: "uppercase",
                    fontSize: theme.other.typography.fontSize.xs,
                    fontWeight: theme.other.typography.fontWeight.semibold,
                    letterSpacing: theme.other.typography.letterSpacing.wide,
                    backgroundColor: theme.other.brand.secondary,
                    color: theme.other.text.white,
                  }}
                >
                  Coming Soon
                </Badge>
              </Box>

              <Box
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "-40px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Box
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: theme.other.borderRadius.xl,
                    background: theme.other.backgrounds.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `4px solid ${theme.other.backgrounds.primary}`,
                    boxShadow: theme.other.shadows.lg,
                  }}
                >
                  <Box
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.other.borderRadius.lg,
                      background: `${theme.other.brand.secondary}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconRocket 
                      size={theme.other.sizes.icon["3xl"]} 
                      color={theme.other.brand.secondary}
                      stroke={1.5}
                    />
                  </Box>
                </Box>
              </Box>

              <Stack gap="xs" style={{ padding: theme.other.spacing.lg, paddingTop: theme.other.spacing.md }}>
                <Text
                  ta="center"
                  size="lg"
                  fw={theme.other.typography.fontWeight.semibold}
                  style={{
                    color: theme.other.text.primary,
                  }}
                >
                  Release Management
                </Text>

                <Text 
                  ta="center" 
                  size="sm" 
                  c="dimmed"
                  fw={theme.other.typography.fontWeight.medium}
                  style={{ minHeight: "60px" }}
                >
                  Advanced release orchestration with staged rollouts and automated approvals
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>
        </Box>
      </Stack>

      {/* Create Organization Modal */}
      <Modal
        opened={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title="Create Organization"
        centered
      >
        <CreateOrgModal
          onSuccess={() => {
            actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
            setCreateOrgOpen(false);
          }}
        />
      </Modal>

      {/* Delete Organization Modal */}
      {deleteOrgState && (
        <Modal
          opened={true}
          onClose={() => setDeleteOrgState(null)}
          title="Delete Organization"
          centered
        >
          <Text>
            Are you sure you want to delete this organization ({deleteOrgState.name})?
          </Text>
          <Group justify="flex-end" mt="lg">
            <Button 
              variant="default" 
              onClick={() => setDeleteOrgState(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={isDeleting}
              onClick={() => {
                deleteOrg(
                  { tenant: deleteOrgState.id },
                  {
                    onSuccess: () => {
                      actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
                      setDeleteOrgState(null);
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
    </Container>
  );
}

