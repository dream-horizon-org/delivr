import { useForm } from "@mantine/form";
import {
  TextInput,
  Button,
  Group,
  Textarea,
  Modal,
  Switch,
  Slider,
  Text,
  Box,
  Tooltip,
  Overlay,
  Stack,
  Badge,
  useMantineTheme,
} from "@mantine/core";
import { ReleaseListResponse } from "../ReleaseListForDeploymentTable/data/getReleaseListForDeployment";
import { useParams, useSearchParams } from "@remix-run/react";
import { IconHelpCircle, IconCheck } from "@tabler/icons-react";
import { useUpdateReleaseDataForDeployment } from "./hooks/useUpdateReleaseDataForDeployment";

type ReleaseEditProps = { data: ReleaseListResponse; refetch: () => void };

export function ReleaseEditFormModal({ data, refetch }: ReleaseEditProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const { mutate, isLoading } = useUpdateReleaseDataForDeployment();
  const [serachParams, setSearchParams] = useSearchParams();

  const close = () => {
    setSearchParams((p) => {
      p.delete("edit");
      return p;
    });
  };
  
  const form = useForm<ReleaseEditProps["data"]>({
    mode: "uncontrolled",
    initialValues: data,
    validateInputOnChange: true,
    validate: {
      description: (value) => {
        return value.length ? null : "Description can't be empty";
      },
      targetVersions: (value) => {
        return value.length ? null : "Target version can't be empty";
      },
    },
  });

  const onSubmit = () => {
    const formData = form.getValues();
    mutate(
      {
        appId: params.app ?? "",
        deploymentName: serachParams.get("deployment") ?? "",
        appVersion: formData.targetVersions,
        description: formData.description,
        isDisabled: !formData.status,
        isMandatory: formData.mandatory,
        label: formData.label,
        rollout: formData.rollout,
        tenant: params.org ?? "",
      },
      {
        onSuccess: () => {
          refetch();
          close();
        },
      }
    );
  };

  const currentRollout = form.getValues().rollout;
  const canIncreaseRollout = data.rollout < 100;

  return (
    <Modal
      opened={
        !!serachParams.get("edit") &&
        serachParams.get("edit") === "true"
      }
      onClose={close}
      size="md"
      centered
      radius="md"
      title={
        <Text size="lg" fw={600} c={theme.colors.slate[9]}>
          Edit Release
        </Text>
      }
      overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
    >
      {isLoading && <Overlay color="white" backgroundOpacity={0.7} zIndex={1000} />}
      
      <Stack gap="md">
        {/* Release Label - Read Only */}
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">Release</Text>
          <Badge size="lg" variant="light" color="brand" radius="sm">
            {data.label}
          </Badge>
        </Group>

        {/* Description */}
        <Textarea
          label="Description"
          placeholder="What's in this release?"
          key={form.key("description")}
          {...form.getInputProps("description")}
          minRows={2}
          maxRows={4}
          autosize
          styles={{
            label: { fontWeight: 500, marginBottom: 6 },
          }}
        />

        {/* Target Version */}
        <TextInput
          label="Target Version"
          placeholder="e.g., 1.0.0"
          key={form.key("targetVersions")}
          {...form.getInputProps("targetVersions")}
          styles={{
            label: { fontWeight: 500, marginBottom: 6 },
          }}
        />

        {/* Rollout Section */}
        {canIncreaseRollout ? (
          <Box>
            <Group justify="space-between" mb="xs">
              <Group gap={6}>
                <Text size="sm" fw={500}>Rollout</Text>
                <Tooltip 
                  label="Rollout percentage can only be increased" 
                  withArrow
                  position="top"
                >
                  <IconHelpCircle size={14} color={theme.colors.slate[4]} style={{ cursor: "help" }} />
                </Tooltip>
              </Group>
              <Badge size="lg" variant="filled" color="brand">
                {currentRollout}%
              </Badge>
            </Group>
            <Slider
              value={currentRollout}
              max={100}
              min={data.rollout}
              step={1}
              onChange={(value) => form.setFieldValue("rollout", value)}
              color="brand"
              size="md"
              marks={[
                { value: data.rollout, label: `${data.rollout}%` },
                { value: 100, label: "100%" },
              ]}
              styles={{
                markLabel: { fontSize: 11, color: theme.colors.slate[5] },
              }}
            />
            <Text size="xs" c="dimmed" mt="md">
              Minimum: {data.rollout}% (current) • Maximum: 100%
            </Text>
          </Box>
        ) : (
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>Rollout</Text>
            <Badge size="lg" variant="filled" color="green" leftSection={<IconCheck size={12} />}>
              100% (Full)
            </Badge>
          </Group>
        )}

        {/* Status Toggle */}
        <Box
          p="sm"
          style={{
            background: theme.colors.slate[0],
            borderRadius: theme.radius.md,
          }}
        >
          <Switch
            label="Active"
            description={form.getValues().status ? "Release is being distributed" : "Release is paused"}
            checked={form.getValues().status}
            onChange={(e) => form.setFieldValue("status", e.currentTarget.checked)}
            color="brand"
            size="md"
            styles={{
              label: { fontWeight: 500 },
              description: { marginTop: 2 },
            }}
          />
        </Box>

        {/* Actions */}
        <Group justify="flex-end" gap="sm" mt="xs">
          <Button
            variant="default"
            onClick={close}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            color="brand"
            onClick={onSubmit}
            disabled={!!Object.keys(form.errors).length}
            loading={isLoading}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
