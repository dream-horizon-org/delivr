import {
  Stack,
  Button,
  TextInput,
  Text,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding } from "@tabler/icons-react";
import { useState } from "react";
import { showSuccessToast, showErrorToast } from "~/utils/toast";
import { PROJECT_MESSAGES } from "~/constants/toast-messages";

type CreateOrgModalProps = {
  onSuccess: () => void;
};

export function CreateOrgModal({ onSuccess }: CreateOrgModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const theme = useMantineTheme();

  const form = useForm<{ orgName: string }>({
    mode: "controlled",
    initialValues: { orgName: "" },
    validateInputOnChange: true,
    validateInputOnBlur: true,
    validate: {
      orgName: (value) => {
        if (!value || value.length === 0) return "Project name is required";
        if (value.length < 3) return "Project name must be at least 3 characters";
        return null;
      },
    },
  });

  const handleSubmit = async (values: { orgName: string }) => {
    if (form.validate().hasErrors) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: values.orgName }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Failed to create project";
        const statusCode = response.status;
        
        try {
          const errorData = await response.json();
          
          // Extract error message from response - use backend message directly
          if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error.message || errorMessage;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If JSON parsing fails, keep the default fallback message
          console.error("Failed to parse error response:", parseError);
        }
        
        // Create error with status code for proper handling
        const error = new Error(errorMessage) as Error & { statusCode?: number };
        error.statusCode = statusCode;
        throw error;
      }

      showSuccessToast(PROJECT_MESSAGES.CREATE_SUCCESS);

      onSuccess();
    } catch (error: any) {
      const errorMessage = error.message || PROJECT_MESSAGES.CREATE_ERROR.message;
      const isConflict = error.statusCode === 409 || errorMessage.includes("already exists");
      
      showErrorToast({
        title: isConflict ? PROJECT_MESSAGES.CREATE_CONFLICT.title : PROJECT_MESSAGES.CREATE_ERROR.title,
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Create a new project to manage your apps and team members.
        </Text>

        <TextInput
          label="Project Name"
          placeholder="Enter project name"
          leftSection={<IconBuilding size={18} stroke={1.5} />}
          required
          size="md"
          key={form.key("orgName")}
          {...form.getInputProps("orgName")}
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          size="md"
          loading={isLoading}
          disabled={
            isLoading ||
            !!Object.keys(form.errors).length ||
            !form.values.orgName?.trim()
          }
        >
          Create Project
        </Button>
      </Stack>
    </form>
  );
}
