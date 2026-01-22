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
import { CTAButton } from "~/components/Common/CTAButton";

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
        <Group gap="sm">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: theme.radius.md,
              background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconKey size={20} color="white" />
          </Box>
          <Title order={2} size="h4">Create Deployment Key</Title>
        </Group>
      }
    >
      <Stack gap="lg">
        {!data ? (
          <>
            <Alert
              icon={<IconInfoCircle size={18} />}
              variant="light"
              color="brand"
              radius="md"
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
                leftSection={<IconSparkles size={18} />}
                disabled={!!Object.keys(form.errors).length}
                loading={isLoading}
                onClick={() => {
                  if (form.validate().hasErrors) {
                    return;
                  }

                  mutate(
                    { ...form.getValues(), appId: params.app ?? "", tenant: params.org ?? "" },
                    {
                      onSuccess: () => {
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
                background: `linear-gradient(135deg, ${theme.colors.slate[0]} 0%, #ffffff 100%)`,
                borderColor: theme.colors.brand[5],
              }}
            >
              <Stack gap="md" align="center">
                <Box
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: theme.shadows.lg,
                  }}
                >
                  <IconCheck size={32} color="white" />
                </Box>

                <Stack gap="xs" align="center">
                  <Title order={4} c={theme.colors.slate[9]}>
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
                          color={copied ? "teal" : "brand"}
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
