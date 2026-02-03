import {
  Stack,
  Button,
  TextInput,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { showSuccessToast, showErrorToast } from "~/utils/toast";
import { PROJECT_MESSAGES } from "~/constants/toast-messages"; // Keep PROJECT_MESSAGES for now (can be updated to APP_MESSAGES later)

type CreateAppModalProps = {
  onSuccess: () => void;
};

export function CreateAppModal({ onSuccess }: CreateAppModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const form = useForm<{ appName: string }>({
    mode: "controlled",
    initialValues: { appName: "" },
    validateInputOnChange: true,
    validateInputOnBlur: true,
    validate: {
      appName: (value) => {
        if (!value || value.length === 0) return "App name is required";
        if (value.length < 3) return "App name must be at least 3 characters";
        return null;
      },
    },
  });

  const handleSubmit = async (values: { appName: string }) => {
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
        body: JSON.stringify({ displayName: values.appName }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Failed to create app";
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

      const json = await response.json() as { data?: { app?: { id?: string } }; app?: { id?: string } };
      const createdAppId = json?.data?.app?.id ?? json?.app?.id;
      if (createdAppId) {
        navigate(`/dashboard/${createdAppId}/onboarding`);
      }
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
          Create a new app to manage your releases and team members.
        </Text>

        <TextInput
          label="App Name"
          placeholder="Enter app name"
          leftSection={<IconBuilding size={18} stroke={1.5} />}
          required
          size="md"
          key={form.key("appName")}
          {...form.getInputProps("appName")}
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
            !form.values.appName?.trim()
          }
        >
          Create App
        </Button>
      </Stack>
    </form>
  );
}
