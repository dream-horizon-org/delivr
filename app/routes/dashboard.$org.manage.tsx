import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { Container, Title, Text, Paper } from "@mantine/core";
import { TenantCollaboratorsPage } from "~/components/Pages/components/TenantCollaborators";
import { authenticateLoaderRequest } from "~/utils/authenticate";

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response("Organization not found", { status: 404 });
  }

  return json({ 
    tenantId: org,
    user: user.user
  });
});

export default function ManageTenantCollaborators() {
  const { tenantId, user } = useLoaderData<typeof loader>();
  
  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <Title order={2} mb="md">Team Members</Title>
        <Text c="dimmed" size="sm" mb="xl">
          Manage your organization's team members and their permissions
        </Text>
        
        <TenantCollaboratorsPage tenantId={tenantId} userId={user.id} />
      </Paper>
    </Container>
  );
}
