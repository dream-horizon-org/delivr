import { Group, TextInput } from "@mantine/core";
import { useParams } from "@remix-run/react";
import { useGetOrgList } from "../../OrgListNavbar/hooks/useGetOrgList";

export function ContextFields() {
  const params = useParams();
  
  // Get organization list to resolve org name
  const { data: orgs = [], isLoading } = useGetOrgList();
  const currentOrg = orgs.find(org => org.id === params.org);
  
  // Determine organization display value and error state
  let orgDisplayValue: string;
  let orgError = false;
  
  if (isLoading) {
    orgDisplayValue = 'Loading...';
  } else if (currentOrg) {
    orgDisplayValue = currentOrg.orgName;
  } else if (params.org) {
    orgDisplayValue = `Organization with ID '${params.org}' not found`;
    orgError = true;
  } else {
    orgDisplayValue = 'No organization specified';
    orgError = true;
  }

  return (
    <Group grow>
      <TextInput
        label="Organization"
        value={orgDisplayValue}
        readOnly
        error={orgError}
        styles={{
          input: {
            cursor: 'default',
            color: orgError ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-dimmed)',
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
