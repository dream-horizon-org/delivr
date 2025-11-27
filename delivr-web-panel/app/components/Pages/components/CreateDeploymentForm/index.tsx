import {
  Button,
  TextInput,
  Box,
  Modal,
  rem,
  CopyButton,
  Text,
  Stack,
  Group,
  Paper,
  Title,
  Alert,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCheck, IconCopy, IconKey, IconInfoCircle, IconSparkles } from "@tabler/icons-react";
import { useCreateDeployment } from "./hooks/useCreateDeployment";
import { useParams } from "@remix-run/react";
import { CTAButton } from "~/components/CTAButton";

export type CreateTokenFormProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateDeploymentForm({ open, onClose }: CreateTokenFormProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const { mutate, data, isLoading } = useCreateDeployment();
  const form = useForm<{ name: string }>({
    mode: "controlled",
    initialValues: { name: "" },
    validateInputOnChange: true,
    validateInputOnBlur: true,
    validate: {
      name: (value) => {
        if (!value || !value.length) return "Deployment name is required";
        if (value.length < 3) return "Name must be at least 3 characters";
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) return "Only alphanumeric, dash and underscore allowed";
        return null;
      },
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal 
      opened={open} 
      onClose={handleClose}
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
            <IconKey size={theme.other.sizes.icon.xl} color={theme.other.text.white} />
          </Box>
          <Title order={3}>Create Deployment Key</Title>
        </Group>
      }
    >
      <Stack gap="lg">
        {!data ? (
          <>
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
              Create a new deployment environment for your app (e.g., Production, Staging, Development)
            </Alert>

            <TextInput
              label="Deployment Name"
              placeholder="e.g., Production, Staging, Development"
              description="Choose a unique name for this deployment environment"
              required
              withAsterisk
              key={form.key("name")}
              {...form.getInputProps("name")}
              disabled={isLoading}
              size="md"
              styles={{
                input: {
                  "&:focus": {
                    borderColor: theme.other.brand.primary,
                  },
                },
              }}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                color="gray"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <CTAButton
                leftSection={<IconSparkles size={theme.other.sizes.icon.lg} />}
                disabled={!!Object.keys(form.errors).length}
                loading={isLoading}
                onClick={() => {
                  // Validate form before submitting
                  if (form.validate().hasErrors) {
                    return;
                  }
                  
                  mutate(
                    { ...form.getValues(), appId: params.app ?? "", tenant: params.org ?? "" },
                    {
                      onSuccess: () => {
                        // Close modal immediately after successful creation
                        handleClose();
                      },
                    }
                  );
                }}
              >
                Create Deployment
              </CTAButton>
            </Group>
          </>
        ) : (
          <>
            <Paper
              withBorder
              p="xl"
              radius="md"
              style={{
                background: `linear-gradient(135deg, ${theme.other.backgrounds.secondary} 0%, ${theme.other.backgrounds.primary} 100%)`,
                borderColor: theme.other.brand.primary,
              }}
            >
              <Stack gap="md" align="center">
                <Box
                  style={{
                    width: rem(theme.other.sizes.icon["6xl"] || 64),
                    height: rem(theme.other.sizes.icon["6xl"] || 64),
                    borderRadius: theme.other.borderRadius.full,
                    background: theme.other.brand.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: theme.other.shadows.lg,
                  }}
                >
                  <IconCheck size={theme.other.sizes.icon["3xl"]} color={theme.other.text.white} />
                </Box>

                <Stack gap="xs" align="center">
                  <Title order={4} c="gray.9">
                    Deployment Created Successfully!
                  </Title>
                  <Text size="sm" c="dimmed">
                    Your deployment key has been generated
                  </Text>
                </Stack>

                <Divider w="100%" />

                <Stack gap="xs" w="100%">
                  <Text size="sm" fw={500} c="dimmed">
                    Deployment Name
                  </Text>
                  <CopyButton value={data.name}>
                    {({ copied, copy }) => (
                      <>
                        <Button
                          onClick={copy}
                          variant={copied ? "light" : "outline"}
                          color={copied ? "teal" : "violet"}
                          fullWidth
                          size="md"
                          styles={{
                            root: {
                              transition: "all 200ms ease",
                            },
                          }}
                        >
                          <Group justify="space-between" w="100%">
                            <Text
                              size="sm"
                              fw={500}
                              style={{
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {data.name}
                            </Text>
                            {copied ? (
                              <IconCheck style={{ width: rem(18) }} />
                            ) : (
                              <IconCopy style={{ width: rem(18) }} />
                            )}
                          </Group>
                        </Button>
                        <Text size="xs" c="dimmed" ta="center" mt="xs">
                          {copied ? "✓ Copied to clipboard!" : "Click to copy the deployment name"}
                        </Text>
                      </>
                    )}
                  </CopyButton>
                </Stack>
              </Stack>
            </Paper>

            <Group justify="center">
              <CTAButton
                onClick={() => {
                  form.reset();
                  handleClose();
                }}
                size="md"
              >
                Done
              </CTAButton>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
