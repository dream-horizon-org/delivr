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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useMemo } from "react";
import { useNavigate, useParams, useLoaderData } from "@remix-run/react";
import { 
  IconArrowLeft, 
  IconCheck, 
  IconFolderOpen, 
  IconAlertCircle, 
  IconChevronRight, 
  IconRocket, 
  IconFileZip,
  IconSettings,
} from "@tabler/icons-react";
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
          navigate(`/dashboard/${params.org}/${params.app}`);
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const isFormValid = directoryBlob && form.values.appVersion && form.values.deploymentName;

  return (
    <Box>
      {/* Header */}
      <Group gap="md" mb={32}>
        <ActionIcon
          variant="light"
          size="lg"
          radius="md"
          onClick={() => navigate(-1)}
          color="gray"
        >
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Box>
          <Group gap={6} mb={2}>
            <Text size="sm" c={theme.colors.slate[5]}>
              {currentApp?.name || "App"}
            </Text>
            <IconChevronRight size={12} color={theme.colors.slate[4]} />
            <Text size="sm" c={theme.colors.slate[7]}>
              New Release
            </Text>
          </Group>
          <Title order={3} fw={600} c={theme.colors.slate[9]}>
            Create Release
          </Title>
        </Box>
      </Group>

      {/* Main Content */}
      <Box maw={720} mx="auto">
        <Card withBorder radius="lg" p={0} style={{ overflow: "hidden" }}>
          {/* Bundle Upload Section */}
          <Box 
            p="xl" 
            style={{ 
              background: directoryBlob 
                ? `linear-gradient(135deg, ${theme.colors.brand[0]} 0%, #ffffff 100%)`
                : theme.colors.slate[0],
              borderBottom: `1px solid ${theme.colors.slate[2]}`,
            }}
          >
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <ThemeIcon 
                  size="lg" 
                  radius="md" 
                  color={directoryBlob ? "brand" : "gray"}
                  variant={directoryBlob ? "filled" : "light"}
                >
                  {directoryBlob ? <IconCheck size={18} /> : <IconFileZip size={18} />}
                </ThemeIcon>
                <Box>
                  <Text size="md" fw={600} c={theme.colors.slate[8]}>
                    Application Bundle
                  </Text>
                  <Text size="xs" c={theme.colors.slate[5]}>
                    {directoryBlob ? "Bundle ready for upload" : "Select your compiled app files"}
                  </Text>
                </Box>
              </Group>
              {directoryBlob && (
                <Badge color="brand" variant="light" size="lg">
                  Ready
                </Badge>
              )}
            </Group>

            {directoryBlob && directoryName ? (
              <Card 
                p="md" 
                radius="md"
                style={{
                  background: "#ffffff",
                  border: `1px solid ${theme.colors.brand[2]}`,
                }}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconFileZip size={20} color={theme.colors.brand[6]} />
                    <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                      {directoryName}
                    </Text>
                  </Group>
                  <Button 
                    size="xs" 
                    variant="subtle" 
                    color="gray"
                    onClick={handleDirectoryCancel}
                  >
                    Change
                  </Button>
                </Group>
              </Card>
            ) : (
              <Card
                p="xl"
                radius="md"
                style={{
                  background: "#ffffff",
                  border: `2px dashed ${theme.colors.slate[3]}`,
                }}
              >
                <Stack align="center" gap="md">
                  <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                    <IconFolderOpen size={28} />
                  </ThemeIcon>
                  <Box ta="center">
                    <Text size="sm" fw={500} c={theme.colors.slate[7]} mb={4}>
                      Select your build folder
                    </Text>
                    <Text size="xs" c={theme.colors.slate[5]}>
                      Choose the directory containing your app bundle
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
              </Card>
            )}
          </Box>

          {/* Configuration Section */}
          <Box p="xl">
            <Group gap="sm" mb="lg">
              <ThemeIcon size="lg" radius="md" color="brand" variant="light">
                <IconSettings size={18} />
              </ThemeIcon>
              <Text size="md" fw={600} c={theme.colors.slate[8]}>
                Release Configuration
              </Text>
            </Group>

            <Stack gap="lg">
              {/* Version & Deployment */}
              <Group grow gap="lg">
                <TextInput
                  label="App Version"
                  placeholder="1.0.0"
                  required
                  size="md"
                  {...form.getInputProps("appVersion")}
                  styles={{
                    label: { fontWeight: 500, marginBottom: 6 },
                  }}
                />
                <Select
                  label="Deployment Key"
                  placeholder="Select deployment"
                  required
                  size="md"
                  data={deploymentOptions}
                  {...form.getInputProps("deploymentName")}
                  disabled={deploymentsLoading}
                  styles={{
                    label: { fontWeight: 500, marginBottom: 6 },
                  }}
                />
              </Group>

              {/* Rollout */}
              <Box>
                <Group justify="space-between" mb={8}>
                  <Text size="sm" fw={500} c={theme.colors.slate[7]}>
                    Rollout Percentage
                  </Text>
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
                  mb="lg"
                />
              </Box>

              {/* Release Notes */}
              <Textarea
                label="Release Notes"
                placeholder="Describe what's new in this release (optional)"
                size="md"
                {...form.getInputProps("description")}
                minRows={3}
                autosize
                maxRows={6}
                styles={{
                  label: { fontWeight: 500, marginBottom: 6 },
                }}
              />

              {/* Options */}
              <Card 
                p="md" 
                radius="md"
                style={{ background: theme.colors.slate[0] }}
              >
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                      Start as Disabled
                    </Text>
                    <Text size="xs" c={theme.colors.slate[5]}>
                      Release won't be distributed until you enable it
                    </Text>
                  </Box>
                  <Switch
                    color="brand"
                    size="md"
                    {...form.getInputProps("disabled", { type: "checkbox" })}
                  />
                </Group>
              </Card>
            </Stack>
          </Box>

          {/* Actions Footer */}
          <Box 
            p="xl" 
            style={{ 
              borderTop: `1px solid ${theme.colors.slate[2]}`,
              background: theme.colors.slate[0],
            }}
          >
            <Group justify="space-between">
              <Button 
                variant="subtle" 
                color="gray"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                color="brand"
                size="md"
                leftSection={<IconRocket size={18} />}
                onClick={handleReviewClick}
                disabled={!isFormValid}
              >
                Review & Create
              </Button>
            </Group>
          </Box>
        </Card>
      </Box>

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => !isSubmitting && setReviewModalOpen(false)}
        title={
          <Text size="lg" fw={600} c={theme.colors.slate[9]}>
            Confirm Release
          </Text>
        }
        size="sm"
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
              }}
            >
              <Loader size="md" color="brand" />
              <Text size="sm" c={theme.colors.slate[6]}>Creating release...</Text>
            </Box>
          )}

          {/* Summary Table */}
          <Box
            style={{
              background: theme.colors.slate[0],
              borderRadius: theme.radius.md,
              overflow: "hidden",
            }}
          >
            {/* Bundle */}
            <Group 
              justify="space-between" 
              p="sm"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" c={theme.colors.slate[6]}>Bundle</Text>
              <Text size="sm" fw={500} c={theme.colors.slate[8]} maw={200} truncate>
                {directoryName}
              </Text>
            </Group>

            {/* Version */}
            <Group 
              justify="space-between" 
              p="sm"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" c={theme.colors.slate[6]}>Version</Text>
              <Text size="sm" fw={600} c={theme.colors.slate[9]}>
                {form.values.appVersion}
              </Text>
            </Group>

            {/* Deployment */}
            <Group 
              justify="space-between" 
              p="sm"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" c={theme.colors.slate[6]}>Deployment</Text>
              <Text size="sm" fw={500} c={theme.colors.brand[6]}>
                {form.values.deploymentName}
              </Text>
            </Group>

            {/* Rollout */}
            <Group 
              justify="space-between" 
              p="sm"
              style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}
            >
              <Text size="sm" c={theme.colors.slate[6]}>Rollout</Text>
              <Text size="sm" fw={600} c={theme.colors.brand[6]}>
                {form.values.rollout}%
              </Text>
            </Group>

            {/* Status */}
            <Group justify="space-between" p="sm">
              <Text size="sm" c={theme.colors.slate[6]}>Status</Text>
              <Badge 
                color={form.values.disabled ? "orange" : "green"} 
                variant="light" 
                size="sm"
              >
                {form.values.disabled ? "Disabled" : "Active"}
              </Badge>
            </Group>
          </Box>

          {/* Notes */}
          {form.values.description && (
            <Box>
              <Text size="xs" fw={500} c={theme.colors.slate[5]} mb={6}>
                RELEASE NOTES
              </Text>
              <Text size="sm" c={theme.colors.slate[7]} style={{ whiteSpace: "pre-wrap" }}>
                {form.values.description}
              </Text>
            </Box>
          )}

          {/* Actions */}
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setReviewModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              color="brand"
              size="sm"
              leftSection={<IconRocket size={16} />}
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
