import {
  Button,
  TextInput,
  Box,
  Modal,
  NativeSelect,
  rem,
  CopyButton,
  Text,
  Group,
  Title,
  useMantineTheme,
  ThemeIcon,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCreateToken } from "./hooks/useCreateToken";
import { IconCheck, IconCopy, IconKey } from "@tabler/icons-react";
import { CreateTokenArgs } from "./data/createToken";

export type CreateTokenFormProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateTokenForm({ open, onClose }: CreateTokenFormProps) {
  const theme = useMantineTheme();
  const { mutate, data, isLoading, reset } = useCreateToken();
  const form = useForm<{ name: string; access: CreateTokenArgs["access"] }>({
    mode: "uncontrolled",
    initialValues: { name: "", access: "Read" },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return value.length ? null : "Name  Can't be Empty";
      },
    },
  });
  return (
    <Modal
      opened={open}
      onClose={() => {
        form.reset();
        onClose();
        reset();
      }}
      title={
        <Group gap="md" align="center">
          <ThemeIcon
            size={44}
            radius="md"
            variant="gradient"
            gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
          >
            <IconKey size={22} />
          </ThemeIcon>
          <Title order={3} fw={600}>Create Token</Title>
        </Group>
      }
      size="lg"
      centered
      padding="xl"
      radius="md"
    >
      <Box>
        <Stack gap="lg" mt="md">
          <TextInput
            label="Enter Token Name"
            placeholder="Token Name"
            key={form.key("name")}
            {...form.getInputProps("name")}
            disabled={isLoading}
            size="md"
            styles={{
              label: {
                fontWeight: 500,
                marginBottom: rem(8),
              },
            }}
          />

          <NativeSelect
            label="Access Type"
            data={["All", "Write", "Read"]}
            key={form.key("access")}
            {...form.getInputProps("access")}
            disabled={isLoading}
            size="md"
            styles={{
              label: {
                fontWeight: 500,
                marginBottom: rem(8),
              },
            }}
          />

          {data && (
            <CopyButton value={data.name}>
              {({ copied, copy }) => (
                <Button
                  onClick={copy}
                  fullWidth
                  size="md"
                  h={48}
                  variant="gradient"
                  gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
                  leftSection={<IconCopy size={18} />}
                  rightSection={
                    copied && <IconCheck size={18} />
                  }
                  styles={{
                    root: {
                      transition: "all 200ms ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 8px 20px ${theme.other.brand.primary}35`,
                      },
                    },
                    label: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  {copied ? "Copied!" : data.name}
                </Button>
              )}
            </CopyButton>
          )}

          {!data && (
            <Button
              variant="gradient"
              gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
              fullWidth
              size="md"
              h={48}
              disabled={!!Object.keys(form.errors).length && !isLoading}
              loading={isLoading}
              onClick={() => {
                if (form.validate().hasErrors) {
                  return;
                }
                mutate(form.getValues());
              }}
              styles={{
                root: {
                  transition: "all 200ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 8px 20px ${theme.other.brand.primary}35`,
                  },
                },
              }}
            >
              Create Token
            </Button>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}
