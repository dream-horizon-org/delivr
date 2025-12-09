import { TextInput, Stack, Modal, Text, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconUserPlus } from "@tabler/icons-react";

import { useParams } from "@remix-run/react";
import { useAddCollabarator } from "./hooks/useAddCollabarator";

export type AddCollboratorFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddCollboratorForm({ open, onClose, onSuccess }: AddCollboratorFormProps) {
  const params = useParams();
  const { mutate, isLoading } = useAddCollabarator();
  const form = useForm<{ name: string }>({
    mode: "uncontrolled",
    initialValues: { name: "" },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        if (!value || value.trim().length === 0) {
          return "Email is required";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return "Please enter a valid email address";
        }
        return null;
      },
    },
  });

  const handleSubmit = () => {
    if (form.validate().hasErrors) {
      return;
    }
    mutate(
      {
        appId: params.app ?? "",
        tenant: params.org ?? "",
        email: form.getValues().name,
      },
      {
        onSuccess: () => {
          onClose();
          form.reset();
          if (onSuccess) {
            onSuccess();
          }
        },
      }
    );
  };

  return (
    <Modal 
      opened={open} 
      onClose={onClose} 
      title={
        <Text size="lg" fw={600}>Add Collaborator</Text>
      }
      centered
      size="sm"
      radius="md"
    >
      <Stack gap="md">
        <TextInput
          label="Email Address"
          placeholder="collaborator@example.com"
          key={form.key("name")}
          {...form.getInputProps("name")}
          disabled={isLoading}
          required
          size="sm"
        />
        <Button
          fullWidth
          color="brand"
          leftSection={<IconUserPlus size={16} />}
          disabled={!!Object.keys(form.errors).length || isLoading}
          loading={isLoading}
          onClick={handleSubmit}
        >
          Add Collaborator
        </Button>
      </Stack>
    </Modal>
  );
}
