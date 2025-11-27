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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useMemo } from "react";
import { useNavigate, useParams, useLoaderData } from "@remix-run/react";
import { IconArrowLeft, IconCheck, IconUpload, IconFolderOpen, IconEye, IconAlertCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { User } from "~/.server/services/Auth/Auth.interface";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { useGetDeploymentsForApp } from "~/components/Pages/DeploymentList/hooks/getDeploymentsForApp";
import { useCreateRelease } from "~/components/Pages/components/ReleaseForm/hooks/useCreateRelease";
import {
  DirectoryUpload,
} from "~/components/Pages/components/ReleaseForm/components";

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
      {/* Header */}
      <Group mb="xl" gap="md">
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => navigate(-1)}
        >
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={2}>Create New Release</Title>
      </Group>

      {/* Stepper */}
      <Card withBorder shadow="sm" p="xl">
        <Stepper 
          active={active} 
          onStepClick={(stepIndex: number) => {
            // Only allow going to previous steps, not forward
            if (stepIndex < active) {
              setActive(stepIndex);
            }
          }}
        >
          {/* Step 1: Upload Directory */}
          <Stepper.Step label="Upload" description="Select your app bundle">
            <Box mt="xl">
              <Stack gap="lg">
                <Box>
                  <Title order={4} mb="xs">Upload Your Application Bundle</Title>
                  <Text size="sm" c="dimmed">
                    Select a directory containing your application files. We'll automatically zip and upload it.
                  </Text>
                </Box>

                <Card
                  withBorder
                  padding="xl"
                  radius="md"
                  style={{
                    background: `linear-gradient(135deg, ${theme.other.backgrounds.secondary} 0%, ${theme.other.backgrounds.primary} 100%)`,
                    borderColor: theme.other.borders.secondary,
                  }}
                >
                  <Stack gap="lg" align="center" py="md">
                    {directoryBlob && directoryName ? (
                      // Show bundle selected state
                      <>
                        <Box
                          style={{
                            width: rem(64),
                            height: rem(64),
                            borderRadius: theme.other.borderRadius.full,
                            background: theme.other.brand.gradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: theme.other.shadows.md,
                          }}
                        >
                          <IconCheck size={theme.other.sizes.icon["3xl"]} color={theme.other.text.white} />
                        </Box>
                        
                        <Stack gap="xs" align="center">
                          <Text size="lg" fw={600} c={theme.other.brand.primary}>
                            Bundle Selected
                          </Text>
                          <Text size="sm" c="dimmed" ta="center" fw={500}>
                            {directoryName}
                          </Text>
                        </Stack>
                      </>
                    ) : (
                      // Show upload prompt
                      <>
                        <Box
                          style={{
                            width: rem(64),
                            height: rem(64),
                            borderRadius: theme.other.borderRadius.full,
                            background: theme.other.brand.gradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: theme.other.shadows.md,
                          }}
                        >
                          <IconFolderOpen size={theme.other.sizes.icon["3xl"]} color={theme.other.text.white} />
                        </Box>
                        
                        <Stack gap="xs" align="center">
                          <Text size="lg" fw={600}>
                            Select Bundle Directory
                          </Text>
                          <Text size="sm" c="dimmed" ta="center">
                            Click the button below to browse and select your bundle folder
                          </Text>
                        </Stack>
                      </>
                    )}

                    <Box style={{ width: "100%" }}>
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
            </Box>
          </Stepper.Step>

          {/* Step 2: Version & Deployment */}
          <Stepper.Step label="Version" description="App version and deployment">
            <Box mt="xl">
              <Stack gap="md">
                <TextInput
                  label="App Version"
                  placeholder="e.g., 1.0.0"
                  required
                  key={form.key("appVersion")}
                  {...form.getInputProps("appVersion")}
                  description="Semantic version of your app (e.g., 1.0.0, 2.1.3)"
                />
                
                <Select
                  label="Select Deployment Key"
                  placeholder="Select deployment target"
                  required
                  data={deploymentOptions}
                  key={form.key("deploymentName")}
                  {...form.getInputProps("deploymentName")}
                  disabled={deploymentsLoading}
                  searchable
                  description="Choose the deployment environment"
                />

                <Textarea
                  label="Description"
                  placeholder="Describe what's new in this release..."
                  key={form.key("description")}
                  {...form.getInputProps("description")}
                  minRows={3}
                  description="Optional: Add release notes or description"
                />
              </Stack>
            </Box>
          </Stepper.Step>

          {/* Step 3: Configuration */}
          <Stepper.Step label="Configure" description="Rollout and flags">
            <Box mt="xl">
              <Stack gap="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      Rollout Percentage
                    </Text>
                    <Text
                      size="xl"
                      fw={theme.other.typography.fontWeight.bold}
                      style={{
                        color: theme.other.brand.primary,
                      }}
                    >
                      {form.values.rollout}%
                    </Text>
                  </Group>
                  <Box pt="md" pb="xl">
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      value={form.values.rollout}
                      onChange={(value) => form.setFieldValue("rollout", value)}
                      marks={[
                        { value: 1, label: "1%" },
                        { value: 25, label: "25%" },
                        { value: 50, label: "50%" },
                        { value: 75, label: "75%" },
                        { value: 100, label: "100%" },
                      ]}
                      styles={{
                        track: {
                          background: `linear-gradient(90deg, ${theme.other.brand.primary} 0%, ${theme.other.brand.secondary} 100%)`,
                        },
                        thumb: {
                          borderWidth: 2,
                          borderColor: theme.other.brand.primary,
                          backgroundColor: theme.other.backgrounds.primary,
                        },
                      }}
                    />
                  </Box>
                  <Text size="xs" c="dimmed">
                    Percentage of users who will receive this update (1-100)
                  </Text>
                </Stack>

                {/* Temporarily hidden - Mandatory Update option */}
                {/* <Switch
                  label="Mandatory Update"
                  description="Users must install this update to continue"
                  key={form.key("mandatory")}
                  {...form.getInputProps("mandatory", { type: "checkbox" })}
                /> */}

                <Switch
                  label="Disabled"
                  description="Temporarily disable this release from being distributed"
                  key={form.key("disabled")}
                  {...form.getInputProps("disabled", { type: "checkbox" })}
                />
              </Stack>
            </Box>
          </Stepper.Step>

        </Stepper>

        {/* Navigation Buttons */}
        <Group justify="space-between" mt="xl">
          <Button variant="default" onClick={prevStep} disabled={active === 0}>
            Back
          </Button>
          
          {active < 2 ? (
            <Button 
              onClick={nextStep}
              variant="gradient"
              gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            >
              Next Step
            </Button>
          ) : (
            <Button
              leftSection={<IconEye size={18} />}
              onClick={() => {
                // Validate step 3
                const rolloutError = form.validateField("rollout");
                if (!rolloutError.hasError) {
                  setReviewModalOpened(true);
                }
              }}
              variant="gradient"
              gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            >
              Review Release
            </Button>
          )}
        </Group>
      </Card>

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpened}
        onClose={() => !isUploading && setReviewModalOpened(false)}
        title={
          <Group gap="xs">
            <IconEye size={theme.other.sizes.icon["2xl"]} style={{ color: theme.other.brand.primary }} />
            <Title order={3}>Review Your Release</Title>
          </Group>
        }
        size="lg"
        centered
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
                background: "rgba(255, 255, 255, 0.9)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                gap: "16px",
              }}
            >
              <Loader size="lg" color={theme.other.brand.primary} />
              <Stack gap="xs" align="center">
                <Text fw={theme.other.typography.fontWeight.semibold} size="lg">
                  Creating Release...
                </Text>
                <Text size="sm" c="dimmed">
                  Uploading your app bundle
                </Text>
              </Stack>
            </Box>
          )}
          <Text c="dimmed">
            Please review all the details before creating the release. Once created, this cannot be undone.
          </Text>

          <Card withBorder p="lg" style={{ background: theme.other.backgrounds.secondary }}>
            <Stack gap="md">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Bundle
                </Text>
                <Group justify="space-between" mt="xs">
                  <Text size="sm" fw={500}>Directory:</Text>
                  <Text size="sm" c="dimmed">{directoryName || "Not selected"}</Text>
                </Group>
              </Box>

              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="md">
                  Version Information
                </Text>
                <Stack gap="xs" mt="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>App Version:</Text>
                    <Text size="sm" c="dimmed">{form.values.appVersion || "Not set"}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Deployment Key:</Text>
                    <Text size="sm" c="dimmed">{form.values.deploymentName || "Not selected"}</Text>
                  </Group>
                </Stack>
              </Box>

              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="md">
                  Configuration
                </Text>
                <Stack gap="xs" mt="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={theme.other.typography.fontWeight.medium}>Rollout:</Text>
                    <Text size="sm" fw={theme.other.typography.fontWeight.bold} style={{ color: theme.other.brand.primary }}>
                      {form.values.rollout}%
                    </Text>
                  </Group>
                  {/* Temporarily hidden - Mandatory Update */}
                  {/* <Group justify="space-between">
                    <Text size="sm" fw={500}>Mandatory Update:</Text>
                    <Text size="sm" c={form.values.mandatory ? "red" : "dimmed"} fw={form.values.mandatory ? 600 : 400}>
                      {form.values.mandatory ? "Yes" : "No"}
                    </Text>
                  </Group> */}
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Disabled:</Text>
                    <Text size="sm" c={form.values.disabled ? "orange" : "dimmed"} fw={form.values.disabled ? 600 : 400}>
                      {form.values.disabled ? "Yes" : "No"}
                    </Text>
                  </Group>
                </Stack>
              </Box>

              {form.values.description && (
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600} mt="md" mb="xs">
                    Description
                  </Text>
                  <Card withBorder p="md" style={{ background: "white" }}>
                    <Text size="sm">{form.values.description}</Text>
                  </Card>
                </Box>
              )}
            </Stack>
          </Card>

          <Group justify="space-between" mt="md">
            <Button 
              variant="default" 
              onClick={() => setReviewModalOpened(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              leftSection={!isUploading && <IconCheck size={18} />}
              onClick={() => handleSubmit()}
              loading={isUploading}
              disabled={isUploading}
              variant="gradient"
              gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            >
              {isUploading ? "Creating..." : "Create Release"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
