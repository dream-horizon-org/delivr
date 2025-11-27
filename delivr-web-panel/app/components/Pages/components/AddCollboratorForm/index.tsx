import { TextInput, Stack, Modal, useMantineTheme } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useParams } from "@remix-run/react";
import { useAddCollabarator } from "./hooks/useAddCollabarator";
import { CTAButton } from "~/components/CTAButton";

export type AddCollboratorFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddCollboratorForm({ open, onClose, onSuccess }: AddCollboratorFormProps) {
  const theme = useMantineTheme();
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
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return "Please enter a valid email address";
        }
        return null;
      },
    },
  });

  // Debug log to see what params we're getting
  console.log('AddCollaboratorForm params:', { app: params.app, org: params.org });

  return (
    <Modal 
      opened={open} 
      onClose={onClose} 
      title="Add Collaborator" 
      centered
      size="md"
    >
      <Stack gap="lg">
        <TextInput
          label="Enter Email"
          placeholder="collaborator@email.com"
          key={form.key("name")}
          {...form.getInputProps("name")}
          disabled={isLoading}
          required
          withAsterisk
          size="md"
          styles={{
            input: {
              "&:focus": {
                borderColor: theme.other.brand.primary,
              },
            },
          }}
        />
        <CTAButton
          fullWidth
          size="md"
          disabled={!!Object.keys(form.errors).length || isLoading}
          loading={isLoading}
          onClick={() => {
            // Validate before submitting
            if (form.validate().hasErrors) {
              return;
            }
            console.log('Submitting with:', {
              appId: params.app,
              tenant: params.org,
              email: form.getValues().name,
            });
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
          }}
        >
          Add Collaborator
        </CTAButton>
      </Stack>
    </Modal>
  );
}
