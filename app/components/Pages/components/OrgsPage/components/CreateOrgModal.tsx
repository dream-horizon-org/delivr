import {
  Stack,
  Button,
  TextInput,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import axios from "axios";

type CreateOrgModalProps = {
  onSuccess: () => void;
};

export function CreateOrgModal({ onSuccess }: CreateOrgModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<{ orgName: string }>({
    mode: "controlled",
    initialValues: { orgName: "" },
    validateInputOnChange: true,
    validateInputOnBlur: true,
    validate: {
      orgName: (value) => {
        if (!value || value.length === 0) return "Organization name is required";
        if (value.length < 3) return "Organization name must be at least 3 characters";
        return null;
      },
    },
  });

  const handleSubmit = async (values: { orgName: string }) => {
    // Validate before submitting
    if (form.validate().hasErrors) {
      return;
    }

    setIsLoading(true);
    try {
      // Create organization using the new tenant API
      // Use a Remix form action instead of direct axios call
      const formData = new FormData();
      formData.append("displayName", values.orgName);
      
      const response = await fetch("/api/v1/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: values.orgName }),
        credentials: "include", // Important: includes cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create organization");
      }

      notifications.show({
        title: "Success",
        message: "Organization created successfully!",
        color: "green",
      });

      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to create organization",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Create a new organization to manage your apps and team members.
        </Text>

        <TextInput
          label="Organization Name"
          placeholder="My Company"
          leftSection={<IconBuilding size={18} />}
          required
          withAsterisk
          key={form.key("orgName")}
          {...form.getInputProps("orgName")}
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={
            isLoading ||
            !!Object.keys(form.errors).length ||
            !form.values.orgName?.trim()
          }
        >
          Create Organization
        </Button>
      </Stack>
    </form>
  );
}

