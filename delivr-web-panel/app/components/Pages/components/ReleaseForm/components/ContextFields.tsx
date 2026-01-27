import { Group, TextInput } from "@mantine/core";
import { useParams } from "@remix-run/react";
import { useGetAppList } from "../../OrgListNavbar/hooks/useGetAppList";

export function ContextFields() {
  const params = useParams();
  
  // Get app list to resolve app name
  const { data: apps = [], isLoading } = useGetAppList();
  const currentApp = apps.find(app => app.id === params.org); // params.org is actually appId
  
  // Determine app display value and error state
  let appDisplayValue: string;
  let appError = false;
  
  if (isLoading) {
    appDisplayValue = 'Loading...';
  } else if (currentApp) {
    appDisplayValue = currentApp.displayName || currentApp.name;
  } else if (params.org) {
    appDisplayValue = `App with ID '${params.org}' not found`;
    appError = true;
  } else {
    appDisplayValue = 'No app specified';
    appError = true;
  }

  return (
    <Group grow>
      <TextInput
        label="App"
        value={appDisplayValue}
        readOnly
        error={appError}
        styles={{
          input: {
            cursor: 'default',
            color: appError ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)',
          },
        }}
      />
      <TextInput
        label="Application"
        value={params.app || 'No application specified'}
        readOnly
        error={!params.app}
        styles={{
          input: {
            cursor: 'default',
            color: !params.app ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)',
          },
        }}
      />
    </Group>
  );
}
