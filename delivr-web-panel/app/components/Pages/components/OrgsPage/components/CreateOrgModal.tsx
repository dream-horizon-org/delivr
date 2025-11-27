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
import { route } from "routes-gen";

type CreateOrgModalProps = {
  onSuccess: () => void;
};

export function CreateOrgModal({ onSuccess }: CreateOrgModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<{ orgName: string; appName: string }>({
    mode: "controlled",
    initialValues: { orgName: "", appName: "" },
    validateInputOnChange: true,
    validateInputOnBlur: true,
    validate: {
      orgName: (value) => {
        if (!value || value.length === 0) return "Organization name is required";
        if (value.length < 3) return "Organization name must be at least 3 characters";
        return null;
      },
      appName: (value) => {
        if (!value || value.length === 0) return "Initial app name is required";
        if (value.length < 3) return "App name must be at least 3 characters";
        return null;
      },
    },
  });

  const handleSubmit = async (values: { orgName: string; appName: string }) => {
    // Validate before submitting
    if (form.validate().hasErrors) {
      return;
    }

    setIsLoading(true);
    try {
      // Create org by creating an app with orgName
      await axios.post(
        route("/api/v1/:org/apps", { org: "new" }),
        {
          orgName: values.orgName,
          name: values.appName,
        }
      );

      notifications.show({
        title: "Success",
        message: "Organization created successfully!",
        color: "green",
      });

      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to create organization",
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
          Create a new organization with an initial app. You can add more apps later.
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

        <TextInput
          label="Initial App Name"
          placeholder="My First App"
          description="Every organization needs at least one app"
          required
          withAsterisk
          key={form.key("appName")}
          {...form.getInputProps("appName")}
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          loading={isLoading}
          disabled={
            isLoading ||
            !!Object.keys(form.errors).length ||
            !form.values.orgName?.trim() ||
            !form.values.appName?.trim()
          }
        >
          Create Organization
        </Button>
      </Stack>
    </form>
  );
}

