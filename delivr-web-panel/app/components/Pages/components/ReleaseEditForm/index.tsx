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
  Flex,
  Tooltip,
  Overlay,
  Stack,
  Paper,
  Title,
  rem,
  Alert,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import { ReleaseListResponse } from "../ReleaseListForDeploymentTable/data/getReleaseListForDeployment";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";
import { IconHelpOctagon, IconEdit, IconInfoCircle, IconSparkles } from "@tabler/icons-react";
import { useUpdateReleaseDataForDeployment } from "./hooks/useUpdateReleaseDataForDeployment";
import { CTAButton } from "~/components/CTAButton";

type ReleaseEditProps = { data: ReleaseListResponse; refetch: () => void };

export function ReleaseEditFormModal({ data, refetch }: ReleaseEditProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const { mutate, isLoading } = useUpdateReleaseDataForDeployment();
  const [serachParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
        return value.length ? null : "Description Can't be Empty";
      },
      targetVersions: (value) => {
        return value.length ? null : "Target Versions Can't be Empty";
      },
    },
  });

  const onSubmit = () => {
    const data = form.getValues();
    mutate(
      {
        appId: params.app ?? "",
        deploymentName: serachParams.get("deployment") ?? "",
        appVersion: data.targetVersions,
        description: data.description,
        isDisabled: !data.status,
        isMandatory: data.mandatory,
        label: data.label,
        rollout: data.rollout,
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

  return (
    <Modal
      opened={
        !!serachParams.get("edit") &&
        serachParams.get("edit") === "true"
      }
      onClose={close}
      size="lg"
      centered
      title={
        <Group gap="xs">
          <Box
            style={{
              width: rem(theme.other.sizes.icon["4xl"]),
              height: rem(theme.other.sizes.icon["4xl"]),
              borderRadius: theme.other.borderRadius.md,
              background: theme.other.brand.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconEdit size={theme.other.sizes.icon.xl} color={theme.other.text.white} />
          </Box>
          <Title order={3}>Edit Release</Title>
        </Group>
      }
    >
      {isLoading && <Overlay color="gray" backgroundOpacity={0.3} />}
      
      <Stack gap="lg">
        <Alert 
          icon={<IconInfoCircle size={18} />} 
          variant="light"
          radius="md"
          styles={{
            root: {
              backgroundColor: theme.other.brand.light,
              borderColor: theme.other.brand.primary,
            },
            icon: {
              color: theme.other.brand.primary,
            },
            message: {
              color: theme.other.text.primary,
            },
          }}
        >
          Update release configuration and rollout settings for version <Text component="span" fw={600}>{data.label}</Text>
        </Alert>

        {/* Release Label (Read-only) */}
        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Stack gap="xs">
            <Text size="sm" fw={600} c="dimmed">
              Release Label
            </Text>
            <Text size="md" fw={500}>
              {data.label}
            </Text>
          </Stack>
        </Paper>

        <Divider />

        {/* Editable Fields */}
        <Stack gap="md">
          <Textarea
            label="Description"
            placeholder="Enter release description..."
            description="Provide details about this release"
            key={form.key("description")}
            {...form.getInputProps("description")}
            minRows={3}
            styles={{
              input: {
                "&:focus": {
                  borderColor: theme.other.brand.primary,
                },
              },
            }}
          />

          <TextInput
            label="Target Version"
            placeholder="e.g., 1.0.0"
            description="App version this release targets"
            key={form.key("targetVersions")}
            {...form.getInputProps("targetVersions")}
            styles={{
              input: {
                "&:focus": {
                  borderColor: theme.other.brand.primary,
                },
              },
            }}
          />

          <Divider />

          {/* Rollout Section */}
          <Box>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  Rollout Percentage
                </Text>
                <Tooltip 
                  label="Rollout can only be increased, not decreased" 
                  withArrow
                  styles={{
                    tooltip: {
                      backgroundColor: theme.other.brand.primary,
                    },
                  }}
                >
                  <IconHelpOctagon size={theme.other.sizes.icon.md} style={{ color: theme.other.brand.primary }} />
                </Tooltip>
              </Group>
              <Text
                size="xl"
                fw={theme.other.typography.fontWeight.bold}
                style={{
                  color: theme.other.brand.primary,
                }}
              >
                {form.getValues().rollout}%
              </Text>
            </Group>
            <Slider
              value={form.getValues().rollout}
              max={100}
              min={data.rollout}
              step={1}
              onChange={(value) => {
                form.setFieldValue("rollout", value);
              }}
              marks={[
                { value: data.rollout, label: `${data.rollout}%` },
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
                markLabel: {
                  fontSize: rem(12),
                },
              }}
            />
            <Text size="xs" c="dimmed" mt="20px" >
              Current rollout: {data.rollout}% → Can increase to 100%
            </Text>
          </Box>

          <Divider />

          {/* Switches */}
          <Group grow>
            <Paper withBorder p="md" radius="md">
              <Switch
                label={
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      Release Status
                    </Text>
                    <Text size="xs" c="dimmed">
                      {form.getValues().status ? "Active" : "Inactive"}
                    </Text>
                  </Stack>
                }
                checked={form.getValues().status}
                {...form.getInputProps("status")}
                styles={{
                  track: {
                    backgroundColor: form.getValues().status ? theme.other.brand.primary : undefined,
                  },
                }}
                size="md"
              />
            </Paper>

            {/* Temporarily hidden - Mandatory Update option */}
            {/* <Paper withBorder p="md" radius="md">
              <Switch
                label={
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      Mandatory Update
                    </Text>
                    <Text size="xs" c="dimmed">
                      {form.getValues().mandatory ? "Required" : "Optional"}
                    </Text>
                  </Stack>
                }
                checked={form.getValues().mandatory}
                {...form.getInputProps("mandatory")}
                styles={{
                  track: {
                    backgroundColor: form.getValues().mandatory ? theme.other.brand.primary : undefined,
                  },
                }}
                size="md"
              />
            </Paper> */}
          </Group>
        </Stack>

        {/* Action Buttons */}
        <Group justify="space-between" mt="md">
          <Button
            variant="subtle"
            color="gray"
            onClick={close}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <CTAButton
            leftSection={<IconSparkles size={theme.other.sizes.icon.lg} />}
            onClick={onSubmit}
            disabled={!!Object.keys(form.errors).length}
            loading={isLoading}
          >
            Save Changes
          </CTAButton>
        </Group>
      </Stack>
    </Modal>
  );
}
