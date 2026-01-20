import {
  Select,
  TextInput,
  Textarea,
  NumberInput,
  Switch,
  Stack,
  Group,
  Text,
  Code,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";

interface ReleaseFormData {
  directory: File | null;
  appVersion: string;
  deploymentName: string;
  rollout: number;
  description: string;
  mandatory: boolean;
  disabled: boolean;
}

interface DeploymentOption {
  value: string;
  label: string;
  searchableText?: string; // Optional: text used for search functionality
  displayName?: string; // Optional: original deployment name for display
  deploymentKey: string;
  description: string;
}

interface ReleaseMetadataProps {
  form: UseFormReturnType<ReleaseFormData>;
  deploymentOptions: DeploymentOption[];
  deploymentsLoading: boolean;
}


export function ReleaseMetadata({ form, deploymentOptions, deploymentsLoading }: ReleaseMetadataProps) {
  return (
    <Stack gap="md">
      {/* App Version */}
      <TextInput
        label="App Version"
        placeholder="e.g., 1.0.0"
        required
        key={form.key("appVersion")}
        {...form.getInputProps("appVersion")}
        description="Semantic version of your app (e.g., 1.0.0, 2.1.3)"
      />

      {/* Target Deployment */}
      <Select
        label="Target Deployment"
        placeholder="Search deployments by name or key..."
        required
        data={deploymentOptions}
        key={form.key("deploymentName")}
        {...form.getInputProps("deploymentName")}
        disabled={deploymentsLoading}
        description="The deployment environment to release to"
        searchable
        filter={({ options, search }) => {
          return options.filter((option: any) => {
            const searchText = option.searchableText || option.label;
            return searchText.toLowerCase().includes(search.toLowerCase().trim());
          });
        }}
        renderOption={(item) => (
          <div>
            <Text size="sm" fw={500}>
              {(item.option as any).displayName || item.option.label}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              Key: {(item.option as any).deploymentKey}
            </Text>
          </div>
        )}
        maxDropdownHeight={300}
        nothingFoundMessage="No deployments found matching your search"
      />

      {/* Rollout Percentage */}
      <NumberInput
        label="Rollout Percentage"
        placeholder="1"
        required
        min={1}
        max={100}
        key={form.key("rollout")}
        {...form.getInputProps("rollout")}
        description="Percentage of users who will receive this update (1-100)"
      />

      {/* Description */}
      <Textarea
        label="Release Description"
        placeholder="Describe what's new in this release..."
        key={form.key("description")}
        {...form.getInputProps("description")}
        description="Optional description of changes in this release"
        rows={3}
      />

      {/* Release Options */}
      <Switch
        label="Disabled Release"
        description="Create the release but keep it disabled initially"
        key={form.key("disabled")}
        {...form.getInputProps("disabled", { type: "checkbox" })}
      />
    </Stack>
  );
}
