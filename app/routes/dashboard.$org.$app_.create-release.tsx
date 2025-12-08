import {
  Box,
  Stepper,
  Button,
  Group,
  Title,
  Text,
  Card,
  Stack,
  TextInput,
  Select,
  Textarea,
  Slider,
  Switch,
  Flex,
  Skeleton,
  Paper,
  rem,
  Modal,
  Alert,
  Loader,
  ActionIcon,
  useMantineTheme,
  ThemeIcon,
  Badge,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useMemo } from "react";
import { useNavigate, useParams, useLoaderData } from "@remix-run/react";
import { IconArrowLeft, IconCheck, IconUpload, IconFolderOpen, IconEye, IconAlertCircle, IconChevronRight, IconRocket, IconSettings, IconFileZip } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { User } from "~/.server/services/Auth/Auth.interface";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useGetDeploymentsForApp } from "~/components/Pages/DeploymentList/hooks/getDeploymentsForApp";
import { useCreateRelease } from "~/components/Pages/components/ReleaseForm/hooks/useCreateRelease";
import {
  DirectoryUpload,
} from "~/components/Pages/components/ReleaseForm/components";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import { useGetAppListForOrg } from "~/components/Pages/components/AppList/hooks/useGetAppListForOrg";

export const loader = authenticateLoaderRequest();

interface ReleaseFormData {
  directory: File | null;
  appVersion: string;
  deploymentName: string;
  rollout: number;
  description: string;
  mandatory: boolean;
  disabled: boolean;
}

export default function CreateReleasePage() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const params = useParams();
  const user = useLoaderData<User>();
  
  const [active, setActive] = useState<number>(0);
  const [directoryBlob, setDirectoryBlob] = useState<Blob | null>(null);
  const [directoryName, setDirectoryName] = useState<string>("");
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewModalOpened, setReviewModalOpened] = useState(false);

  const { data: deployments, isLoading: deploymentsLoading } = useGetDeploymentsForApp();
  const { mutate: createRelease, isLoading: isUploading } = useCreateRelease();
  const { data: orgs = [] } = useGetOrgList();
  const { data: apps = [] } = useGetAppListForOrg({
    orgId: params.org ?? "",
    userEmail: user.user.email,
  });

  const currentOrg = orgs.find((org) => org.id === params.org);
  const currentApp = apps.find((app) => app.id === params.app);

  const form = useForm<ReleaseFormData>({
    mode: "controlled",
    initialValues: {
      directory: null,
      appVersion: "",
      deploymentName: "",
      rollout: 1,
      description: "",
      mandatory: false,
      disabled: false,
    },
    validate: {
      directory: (value) => {
        if (!directoryBlob) {
          return "Please select a directory to upload";
        }
        return null;
      },
      appVersion: (value) => {
        if (!value.trim()) {
          return "App version is required";
        }
        const semverRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
        if (!semverRegex.test(value.trim())) {
          return "App version must be a valid semantic version (e.g., 1.0.0)";
        }
        return null;
      },
      deploymentName: (value) => (!value ? "Please select a deployment Key" : null),
      rollout: (value) => {
        if (value < 1 || value > 100) {
          return "Rollout must be between 1 and 100";
        }
        return null;
      },
    },
  });

  const deploymentOptions = useMemo(() => {
    if (!deployments?.length) return [];
    
    const uniqueDeployments = new Map();
    deployments.forEach((deployment, index) => {
      if (!uniqueDeployments.has(deployment.name)) {
        uniqueDeployments.set(deployment.name, {
          value: deployment.name,
          label: deployment.name,
          description: `Key: ${deployment.deploymentKey}`,
        });
      }
    });
    
    return Array.from(uniqueDeployments.values());
  }, [deployments]);

  const handleDirectoryProcess = (blob: Blob, name: string) => {
    setDirectoryBlob(blob);
    setDirectoryName(name);
    form.setFieldValue("directory", { name } as File);
    form.clearFieldError("directory");
  };

  const handleDirectoryCancel = () => {
    setDirectoryBlob(null);
    setDirectoryName("");
    form.setFieldValue("directory", null);
    form.clearFieldError("directory");
  };

  const nextStep = () => {
    // Validate current step
    if (active === 0) {
      const directoryError = form.validateField("directory");
      if (directoryError.hasError || !directoryBlob || !directoryName) {
        return;
      }
    } else if (active === 1) {
      const versionError = form.validateField("appVersion");
      const deploymentError = form.validateField("deploymentName");
      if (versionError.hasError || deploymentError.hasError) return;
    } else if (active === 2) {
      const rolloutError = form.validateField("rollout");
      if (rolloutError.hasError) return;
    }
    
    setActive((current) => (current < 3 ? current + 1 : current));
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = form.onSubmit((values) => {
    if (!directoryBlob) {
      notifications.show({
        title: "Error",
        message: "Please upload a directory first",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    const formData = new FormData();
    formData.append("package", directoryBlob, directoryName || "app-bundle.zip");
    formData.append("packageInfo", JSON.stringify({
      appVersion: values.appVersion,
      description: values.description,
      isDisabled: values.disabled,
      isMandatory: values.mandatory,
      rollout: values.rollout,
      isBundlePatchingEnabled: false,
    }));

    createRelease(
      {
        orgName: params.org || "",
        appName: params.app || "",
        deploymentName: values.deploymentName,
        formData,
      },
      {
        onSuccess: () => {
          // The hook already shows a success notification
          setReviewModalOpened(false);
          navigate(`/dashboard/${params.org}/${params.app}`);
        },
        onError: () => {
          // The hook already shows an error notification
          // Just ensure the modal stays open so user can retry
        },
      }
    );
  });

  return (
    <Box>
      {/* Header with Breadcrumb */}
      <Box mb={24}>
        {/* Breadcrumb */}
        <Group gap={6} mb={8}>
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
          <Text
            size="sm"
            c={theme.colors.slate[5]}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/dashboard/${params.org}/${params.app}`)}
          >
            {currentApp?.name || "App"}
          </Text>
          <IconChevronRight size={14} color={theme.colors.slate[4]} />
          <Text size="sm" fw={500} c={theme.colors.slate[8]}>
            Create Release
          </Text>
        </Group>

        {/* Title Row */}
        <Group gap="md" align="center">
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="md"
            onClick={() => navigate(-1)}
            style={{
              color: theme.colors.slate[6],
            }}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Box>
            <Title order={3} fw={700} c={theme.colors.slate[9]}>
              Create New Release
            </Title>
            <Text size="sm" c={theme.colors.slate[5]}>
              Deploy a new version to your users
            </Text>
          </Box>
        </Group>
      </Box>

      {/* Stepper Card */}
      <Card 
        withBorder 
        radius="md" 
        p={0}
        style={{
          backgroundColor: "#ffffff",
          borderColor: theme.colors.slate[2],
        }}
      >
        {/* Stepper Header */}
        <Box 
          p="lg" 
          style={{ 
            borderBottom: `1px solid ${theme.colors.slate[2]}`,
            background: theme.colors.slate[0],
          }}
        >
          <Stepper 
            active={active} 
            size="sm"
            color="brand"
            onStepClick={(stepIndex: number) => {
              if (stepIndex < active) {
                setActive(stepIndex);
              }
            }}
            styles={{
              stepLabel: {
                fontWeight: 600,
                fontSize: 14,
              },
              stepDescription: {
                fontSize: 12,
              },
              separator: {
                marginLeft: 8,
                marginRight: 8,
              },
            }}
          >
            <Stepper.Step 
              label="Upload" 
              description="Select bundle"
              icon={<IconFileZip size={18} />}
            />
            <Stepper.Step 
              label="Version" 
              description="Configure details"
              icon={<IconRocket size={18} />}
            />
            <Stepper.Step 
              label="Configure" 
              description="Rollout settings"
              icon={<IconSettings size={18} />}
            />
          </Stepper>
        </Box>

        {/* Step Content */}
        <Box p="xl">
          {/* Step 1: Upload Directory */}
          {active === 0 && (
            <Stack gap="lg">
              <Box>
                <Text size="lg" fw={600} c={theme.colors.slate[9]} mb={4}>
                  Upload Your Application Bundle
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Select a directory containing your application files. We'll automatically zip and upload it.
                </Text>
              </Box>

              <Card
                withBorder
                padding="xl"
                radius="md"
                style={{
                  background: "#ffffff",
                  borderColor: directoryBlob ? theme.colors.brand[3] : theme.colors.slate[2],
                  borderStyle: directoryBlob ? "solid" : "dashed",
                  borderWidth: 2,
                }}
              >
                <Stack gap="lg" align="center" py="lg">
                  {directoryBlob && directoryName ? (
                    <>
                      <ThemeIcon
                        size={72}
                        radius="xl"
                        variant="light"
                        color="brand"
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors.brand[0]} 0%, ${theme.colors.brand[1]} 100%)`,
                        }}
                      >
                        <IconCheck size={36} stroke={2} />
                      </ThemeIcon>
                      
                      <Stack gap={4} align="center">
                        <Text size="lg" fw={600} c={theme.colors.brand[6]}>
                          Bundle Ready
                        </Text>
                        <Badge 
                          size="lg" 
                          variant="light" 
                          color="brand"
                          leftSection={<IconFileZip size={14} />}
                        >
                          {directoryName}
                        </Badge>
                      </Stack>
                    </>
                  ) : (
                    <>
                      <ThemeIcon
                        size={72}
                        radius="xl"
                        variant="light"
                        color="gray"
                        style={{
                          background: theme.colors.slate[1],
                        }}
                      >
                        <IconFolderOpen size={36} color={theme.colors.slate[5]} />
                      </ThemeIcon>
                      
                      <Stack gap={4} align="center">
                        <Text size="lg" fw={600} c={theme.colors.slate[8]}>
                          Select Bundle Directory
                        </Text>
                        <Text size="sm" c={theme.colors.slate[5]} ta="center" maw={400}>
                          Click below to browse and select your bundle folder
                        </Text>
                      </Stack>
                    </>
                  )}

                  <Box style={{ width: "100%", maxWidth: 400 }}>
                    <DirectoryUpload
                      onDirectorySelect={handleDirectoryProcess}
                      onCancel={handleDirectoryCancel}
                      resetTrigger={resetTrigger}
                      error={form.errors.directory as string | undefined}
                      hasSelectedDirectory={!!directoryBlob && !!directoryName}
                      selectedDirectoryName={directoryName}
                    />
                  </Box>
                </Stack>
              </Card>
            </Stack>
          )}

          {/* Step 2: Version & Deployment */}
          {active === 1 && (
            <Stack gap="lg">
              <Box>
                <Text size="lg" fw={600} c={theme.colors.slate[9]} mb={4}>
                  Version & Deployment Details
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Specify the app version and select the deployment target.
                </Text>
              </Box>

              <Stack gap="md" maw={500}>
                <TextInput
                  label="App Version"
                  placeholder="e.g., 1.0.0"
                  required
                  size="md"
                  key={form.key("appVersion")}
                  {...form.getInputProps("appVersion")}
                  description="Semantic version of your app (e.g., 1.0.0, 2.1.3)"
                />
                
                <Select
                  label="Deployment Key"
                  placeholder="Select deployment target"
                  required
                  size="md"
                  data={deploymentOptions}
                  key={form.key("deploymentName")}
                  {...form.getInputProps("deploymentName")}
                  disabled={deploymentsLoading}
                  searchable
                  description="Choose the deployment environment"
                />

                <Textarea
                  label="Release Notes"
                  placeholder="Describe what's new in this release..."
                  key={form.key("description")}
                  {...form.getInputProps("description")}
                  minRows={4}
                  size="md"
                  description="Optional: Add release notes or description"
                />
              </Stack>
            </Stack>
          )}

          {/* Step 3: Configuration */}
          {active === 2 && (
            <Stack gap="lg">
              <Box>
                <Text size="lg" fw={600} c={theme.colors.slate[9]} mb={4}>
                  Rollout Configuration
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Configure how this release will be distributed to users.
                </Text>
              </Box>

              <Card withBorder radius="md" p="lg" maw={600}>
                <Stack gap="lg">
                  <Box>
                    <Group justify="space-between" mb="md">
                      <Box>
                        <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                          Rollout Percentage
                        </Text>
                        <Text size="xs" c={theme.colors.slate[5]}>
                          Percentage of users who will receive this update
                        </Text>
                      </Box>
                      <Badge 
                        size="xl" 
                        variant="filled" 
                        color="brand"
                        style={{ minWidth: 70, textAlign: 'center' }}
                      >
                        {form.values.rollout}%
                      </Badge>
                    </Group>
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      value={form.values.rollout}
                      onChange={(value) => form.setFieldValue("rollout", value)}
                      color="brand"
                      size="md"
                      marks={[
                        { value: 1, label: "1%" },
                        { value: 25, label: "25%" },
                        { value: 50, label: "50%" },
                        { value: 75, label: "75%" },
                        { value: 100, label: "100%" },
                      ]}
                      styles={{
                        markLabel: {
                          fontSize: 11,
                          color: theme.colors.slate[5],
                        },
                      }}
                    />
                  </Box>

                  <Divider color={theme.colors.slate[2]} />

                  <Switch
                    label="Disable Release"
                    description="Temporarily prevent this release from being distributed"
                    size="md"
                    color="brand"
                    key={form.key("disabled")}
                    {...form.getInputProps("disabled", { type: "checkbox" })}
                  />
                </Stack>
              </Card>
            </Stack>
          )}
        </Box>

        {/* Navigation Footer */}
        <Box 
          p="lg" 
          style={{ 
            borderTop: `1px solid ${theme.colors.slate[2]}`,
            background: theme.colors.slate[0],
          }}
        >
          <Group justify="space-between">
            <Button 
              variant="default" 
              onClick={prevStep} 
              disabled={active === 0}
              leftSection={<IconArrowLeft size={16} />}
            >
              Back
            </Button>
            
            {active < 2 ? (
              <Button 
                onClick={nextStep}
                color="brand"
                rightSection={<IconChevronRight size={16} />}
              >
                Continue
              </Button>
            ) : (
              <Button
                leftSection={<IconEye size={16} />}
                onClick={() => {
                  const rolloutError = form.validateField("rollout");
                  if (!rolloutError.hasError) {
                    setReviewModalOpened(true);
                  }
                }}
                color="brand"
              >
                Review & Create
              </Button>
            )}
          </Group>
        </Box>
      </Card>

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpened}
        onClose={() => !isUploading && setReviewModalOpened(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size="md" radius="md" color="brand" variant="light">
              <IconEye size={18} />
            </ThemeIcon>
            <Text size="lg" fw={600} c={theme.colors.slate[9]}>
              Review Release
            </Text>
          </Group>
        }
        size="lg"
        centered
        radius="md"
        closeOnClickOutside={!isUploading}
        closeOnEscape={!isUploading}
      >
        <Stack gap="lg" style={{ position: "relative" }}>
          {/* Loading overlay */}
          {isUploading && (
            <Box
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255, 255, 255, 0.95)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                gap: 16,
              }}
            >
              <Loader size="lg" color="brand" />
              <Stack gap={4} align="center">
                <Text fw={600} size="md" c={theme.colors.slate[9]}>
                  Creating Release...
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Uploading your app bundle
                </Text>
              </Stack>
            </Box>
          )}
          
          <Text size="sm" c={theme.colors.slate[5]}>
            Please review all the details before creating the release.
          </Text>

          <Stack gap="sm">
            {/* Bundle Info */}
            <Card withBorder radius="md" p="md" style={{ background: theme.colors.slate[0] }}>
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <ThemeIcon size="sm" radius="sm" variant="light" color="brand">
                    <IconFileZip size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>Bundle</Text>
                </Group>
                <Badge variant="light" color="brand" size="md">
                  {directoryName || "Not selected"}
                </Badge>
              </Group>
            </Card>

            {/* Version Info */}
            <Card withBorder radius="md" p="md" style={{ background: theme.colors.slate[0] }}>
              <Stack gap="sm">
                <Group gap="sm">
                  <ThemeIcon size="sm" radius="sm" variant="light" color="brand">
                    <IconRocket size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>Version Details</Text>
                </Group>
                <Divider color={theme.colors.slate[2]} />
                <Group justify="space-between">
                  <Text size="sm" c={theme.colors.slate[6]}>App Version</Text>
                  <Text size="sm" fw={600} c={theme.colors.slate[8]}>{form.values.appVersion || "Not set"}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c={theme.colors.slate[6]}>Deployment Key</Text>
                  <Text size="sm" fw={600} c={theme.colors.slate[8]}>{form.values.deploymentName || "Not selected"}</Text>
                </Group>
              </Stack>
            </Card>

            {/* Configuration */}
            <Card withBorder radius="md" p="md" style={{ background: theme.colors.slate[0] }}>
              <Stack gap="sm">
                <Group gap="sm">
                  <ThemeIcon size="sm" radius="sm" variant="light" color="brand">
                    <IconSettings size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>Configuration</Text>
                </Group>
                <Divider color={theme.colors.slate[2]} />
                <Group justify="space-between">
                  <Text size="sm" c={theme.colors.slate[6]}>Rollout</Text>
                  <Badge size="md" variant="filled" color="brand">
                    {form.values.rollout}%
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c={theme.colors.slate[6]}>Status</Text>
                  <Badge 
                    size="md" 
                    variant="light" 
                    color={form.values.disabled ? "orange" : "green"}
                  >
                    {form.values.disabled ? "Disabled" : "Active"}
                  </Badge>
                </Group>
              </Stack>
            </Card>

            {/* Description (if exists) */}
            {form.values.description && (
              <Card withBorder radius="md" p="md" style={{ background: theme.colors.slate[0] }}>
                <Stack gap="sm">
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>Release Notes</Text>
                  <Divider color={theme.colors.slate[2]} />
                  <Text size="sm" c={theme.colors.slate[6]} style={{ whiteSpace: "pre-wrap" }}>
                    {form.values.description}
                  </Text>
                </Stack>
              </Card>
            )}
          </Stack>

          <Group justify="flex-end" mt="md" gap="sm">
            <Button 
              variant="default" 
              onClick={() => setReviewModalOpened(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              leftSection={!isUploading && <IconRocket size={16} />}
              onClick={() => handleSubmit()}
              loading={isUploading}
              disabled={isUploading}
              color="brand"
            >
              {isUploading ? "Creating..." : "Create Release"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
