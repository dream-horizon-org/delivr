import {
  Box,
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
  Modal,
  Loader,
  ActionIcon,
  useMantineTheme,
  ThemeIcon,
  Badge,
  Paper,
  Divider,
  Alert,
  Skeleton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useMemo } from "react";
import { useNavigate, useParams, useLoaderData } from "@remix-run/react";
import { Breadcrumb } from '~/components/Common';
import { 
  IconArrowLeft, 
  IconCheck, 
  IconFolderOpen, 
  IconAlertCircle, 
  IconChevronRight, 
  IconRocket, 
  IconFileZip,
  IconSettings,
  IconUpload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { User } from '~/.server/services/Auth/auth.interface';
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
  
  const [directoryBlob, setDirectoryBlob] = useState<Blob | null>(null);
  const [directoryName, setDirectoryName] = useState<string>("");
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      rollout: 100,
      description: "",
      mandatory: false,
      disabled: false,
    },
    validate: {
      appVersion: (value) => {
        if (!value.trim()) return "Version is required";
        const semverRegex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
        if (!semverRegex.test(value.trim())) return "Invalid version (use format: 1.0.0)";
        return null;
      },
      deploymentName: (value) => (!value ? "Deployment is required" : null),
    },
  });

  const deploymentOptions = useMemo(() => {
    if (!deployments?.length) return [];
    const uniqueDeployments = new Map();
    deployments.forEach((deployment) => {
      if (!uniqueDeployments.has(deployment.name)) {
        uniqueDeployments.set(deployment.name, {
          value: deployment.name,
          label: deployment.name,
        });
      }
    });
    return Array.from(uniqueDeployments.values());
  }, [deployments]);

  const handleDirectoryProcess = (blob: Blob, name: string) => {
    setDirectoryBlob(blob);
    setDirectoryName(name);
    form.setFieldValue("directory", { name } as File);
  };

  const handleDirectoryCancel = () => {
    setDirectoryBlob(null);
    setDirectoryName("");
    form.setFieldValue("directory", null);
  };

  const handleReviewClick = () => {
    const validation = form.validate();
    if (validation.hasErrors) return;

    if (!directoryBlob) {
      notifications.show({
        title: "Missing Bundle",
        message: "Please select a bundle directory",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
      return;
    }

    setReviewModalOpen(true);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("package", directoryBlob!, directoryName || "app-bundle.zip");
    formData.append("packageInfo", JSON.stringify({
      appVersion: form.values.appVersion,
      description: form.values.description,
      isDisabled: form.values.disabled,
      isMandatory: form.values.mandatory,
      rollout: form.values.rollout,
      isBundlePatchingEnabled: false,
    }));

    createRelease(
      {
        orgName: params.org || "",
        appName: params.app || "",
        deploymentName: form.values.deploymentName,
        formData,
      },
      {
        onSuccess: () => {
          setReviewModalOpen(false);
          navigate(`/dashboard/${params.org}/ota/${params.app}`);
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const isFormValid = directoryBlob && form.values.appVersion && form.values.deploymentName;

  // Breadcrumb items
  const breadcrumbItems = [
    { title: currentApp?.name || "App", href: `/dashboard/${params.org}/ota/${params.app}` },
    { title: "Create Release" },
  ];

  return (
    <Box>
      {/* Header */}
      <Box mb={32}>
        <Breadcrumb items={breadcrumbItems} mb={16} />
        
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} fw={700} c={theme.colors.slate[9]} mb={4}>
              Create New Release
            </Title>
            <Text size="md" c={theme.colors.slate[5]}>
              Upload and configure a new release for {currentApp?.name || "your app"}
            </Text>
          </Box>
          
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Group>
      </Box>

      {/* Main Content */}
      <Box maw={800} mx="auto">
        <Stack gap="xl">
          {/* Bundle Upload Section */}
          <Box>
            <Group gap="sm" mb="lg">
              <ThemeIcon 
                size={32} 
                radius="md" 
                color={directoryBlob ? "brand" : "gray"}
                variant="light"
              >
                {directoryBlob ? <IconCheck size={18} /> : <IconUpload size={18} />}
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="lg" fw={600} c={theme.colors.slate[8]} mb={4}>
                  Application Bundle
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  {directoryBlob ? "Bundle ready for upload" : "Select your compiled app files"}
                </Text>
              </Box>
              {directoryBlob && (
                <Badge color="brand" variant="light" size="lg">
                  Ready
                </Badge>
              )}
            </Group>

            {directoryBlob && directoryName ? (
              <Box
                p="md"
                style={{
                  background: theme.colors.brand[0],
                  border: `1px solid ${theme.colors.brand[2]}`,
                  borderRadius: theme.radius.md,
                }}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconFileZip size={20} color={theme.colors.brand[6]} />
                    <Box>
                      <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                        {directoryName}
                      </Text>
                      <Text size="xs" c={theme.colors.slate[5]}>
                        Bundle prepared and ready
                      </Text>
                    </Box>
                  </Group>
                  <Button 
                    size="sm" 
                    variant="subtle" 
                    color="gray"
                    onClick={handleDirectoryCancel}
                  >
                    Change
                  </Button>
                </Group>
              </Box>
            ) : (
              <Box
                p="xl"
                style={{
                  background: theme.colors.slate[0],
                  border: `2px dashed ${theme.colors.slate[3]}`,
                  borderRadius: theme.radius.md,
                }}
              >
                <Stack align="center" gap="md">
                  <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                    <IconFolderOpen size={28} />
                  </ThemeIcon>
                  <Box ta="center">
                    <Text size="md" fw={500} c={theme.colors.slate[7]} mb={4}>
                      Select your build folder
                    </Text>
                    <Text size="sm" c={theme.colors.slate[5]}>
                      Choose the directory containing your app bundle files
                    </Text>
                  </Box>
                  <DirectoryUpload
                    onDirectorySelect={handleDirectoryProcess}
                    onCancel={handleDirectoryCancel}
                    resetTrigger={resetTrigger}
                    error={undefined}
                    hasSelectedDirectory={false}
                    selectedDirectoryName=""
                  />
                </Stack>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Configuration Section */}
          <Box>
            <Group gap="sm" mb="lg">
              <ThemeIcon size={32} radius="md" color="brand" variant="light">
                <IconSettings size={18} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text size="lg" fw={600} c={theme.colors.slate[8]} mb={4}>
                  Release Configuration
                </Text>
                <Text size="sm" c={theme.colors.slate[5]}>
                  Configure version, deployment, and rollout settings
                </Text>
              </Box>
            </Group>

            <Stack gap="lg">
              {/* Version & Deployment */}
              <Group grow gap="lg">
                <TextInput
                  label="App Version"
                  placeholder="1.0.0"
                  required
                  withAsterisk
                  size="md"
                  {...form.getInputProps("appVersion")}
                  description="Semantic version format (e.g., 1.0.0)"
                  styles={{
                    label: { fontWeight: 500, marginBottom: 6 },
                  }}
                />
                <Select
                  label="Deployment Key"
                  placeholder="Select deployment"
                  required
                  withAsterisk
                  size="md"
                  data={deploymentOptions}
                  {...form.getInputProps("deploymentName")}
                  disabled={deploymentsLoading}
                  description={deploymentsLoading ? "Loading deployments..." : "Select target deployment environment"}
                  styles={{
                    label: { fontWeight: 500, marginBottom: 6 },
                  }}
                />
              </Group>

              {/* Rollout */}
              <Box>
                <Group justify="space-between" mb={12}>
                  <Box>
                    <Text size="sm" fw={500} c={theme.colors.slate[7]} mb={4}>
                      Rollout Percentage
                    </Text>
                    <Text size="xs" c={theme.colors.slate[5]}>
                      Percentage of users who will receive this release
                    </Text>
                  </Box>
                  <Badge size="lg" variant="filled" color="brand" radius="sm">
                    {form.values.rollout}%
                  </Badge>
                </Group>
                <Slider
                  min={1}
                  max={100}
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
                    markLabel: { fontSize: 11, color: theme.colors.slate[5] },
                  }}
                />
              </Box>

              {/* Release Notes */}
              <Textarea
                label="Release Notes"
                placeholder="Describe what's new in this release (optional)"
                size="md"
                {...form.getInputProps("description")}
                minRows={4}
                autosize
                maxRows={8}
                description="Optional notes about this release for your team"
                styles={{
                  label: { fontWeight: 500, marginBottom: 6 },
                }}
              />

              {/* Options */}
              <Box
                p="md"
                style={{
                  background: theme.colors.slate[0],
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.slate[2]}`,
                }}
              >
                <Group justify="space-between">
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500} c={theme.colors.slate[8]} mb={4}>
                      Start as Disabled
                    </Text>
                    <Text size="xs" c={theme.colors.slate[5]}>
                      Release won't be distributed until you manually enable it
                    </Text>
                  </Box>
                  <Switch
                    color="brand"
                    size="md"
                    {...form.getInputProps("disabled", { type: "checkbox" })}
                  />
                </Group>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Actions Footer */}
          <Group justify="space-between" pt="md">
            <Button 
              variant="subtle" 
              color="gray"
              onClick={() => navigate(-1)}
              size="md"
            >
              Cancel
            </Button>
            <Button
              color="brand"
              size="md"
              leftSection={<IconRocket size={18} />}
              onClick={handleReviewClick}
              disabled={!isFormValid}
              loading={isUploading}
            >
              Review & Create
            </Button>
          </Group>
        </Stack>
      </Box>

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => !isSubmitting && setReviewModalOpen(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" color="brand" variant="light">
              <IconRocket size={18} />
            </ThemeIcon>
            <Text size="lg" fw={600} c={theme.colors.slate[9]}>
              Review & Confirm Release
            </Text>
          </Group>
        }
        size="md"
        centered
        radius="md"
        closeOnClickOutside={!isSubmitting}
        overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      >
        <Stack gap="lg" style={{ position: "relative" }}>
          {/* Loading Overlay */}
          {isSubmitting && (
            <Box
              style={{
                position: "absolute",
                inset: -16,
                background: "rgba(255,255,255,0.95)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                borderRadius: theme.radius.md,
              }}
            >
              <Loader size="md" color="brand" />
              <Text size="sm" fw={500} c={theme.colors.slate[7]}>Creating release...</Text>
              <Text size="xs" c={theme.colors.slate[5]}>This may take a few moments</Text>
            </Box>
          )}

          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            radius="md"
          >
            <Text size="sm">
              Please review the details below before creating the release. You can make changes by closing this dialog.
            </Text>
          </Alert>

          {/* Summary Table */}
          <Box
            style={{
              border: `1px solid ${theme.colors.slate[2]}`,
              borderRadius: theme.radius.md,
              overflow: "hidden",
            }}
          >
            {/* Bundle */}
            <Group 
              justify="space-between" 
              p="md"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Group gap="sm">
                <IconFileZip size={18} color={theme.colors.brand[6]} />
                <Text size="sm" fw={500} c={theme.colors.slate[6]}>Bundle</Text>
              </Group>
              <Text size="sm" fw={500} c={theme.colors.slate[8]} maw={250} truncate>
                {directoryName}
              </Text>
            </Group>

            {/* Version */}
            <Group 
              justify="space-between" 
              p="md"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" fw={500} c={theme.colors.slate[6]}>Version</Text>
              <Badge size="lg" variant="light" color="brand">
                {form.values.appVersion}
              </Badge>
            </Group>

            {/* Deployment */}
            <Group 
              justify="space-between" 
              p="md"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" fw={500} c={theme.colors.slate[6]}>Deployment</Text>
              <Badge size="lg" variant="light" color="blue">
                {form.values.deploymentName}
              </Badge>
            </Group>

            {/* Rollout */}
            <Group 
              justify="space-between" 
              p="md"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" fw={500} c={theme.colors.slate[6]}>Rollout</Text>
              <Badge size="lg" variant="filled" color="brand">
                {form.values.rollout}%
              </Badge>
            </Group>

            {/* Status */}
            <Group justify="space-between" p="md">
              <Text size="sm" fw={500} c={theme.colors.slate[6]}>Status</Text>
              <Badge 
                color={form.values.disabled ? "orange" : "green"} 
                variant="light" 
                size="lg"
              >
                {form.values.disabled ? "Disabled" : "Active"}
              </Badge>
            </Group>
          </Box>

          {/* Notes */}
          {form.values.description && (
            <Box
              p="md"
              style={{
                background: theme.colors.slate[0],
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Text size="xs" fw={600} c={theme.colors.slate[5]} tt="uppercase" mb={8}>
                Release Notes
              </Text>
              <Text size="sm" c={theme.colors.slate[7]} style={{ whiteSpace: "pre-wrap" }}>
                {form.values.description}
              </Text>
            </Box>
          )}

          {/* Actions */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button 
              variant="default" 
              size="md"
              onClick={() => setReviewModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              color="brand"
              size="md"
              leftSection={<IconRocket size={18} />}
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              Create Release
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
