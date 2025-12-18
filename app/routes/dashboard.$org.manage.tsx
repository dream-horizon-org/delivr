import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { Container, Title, Text, Paper } from "@mantine/core";
import { TenantCollaboratorsPage } from "~/components/Pages/components/TenantCollaborators";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { PermissionService } from "~/utils/permissions";

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response("Organization not found", { status: 404 });
  }

  // Check if user is owner - only owners can manage team
  const isOwner = await PermissionService.isTenantOwner(org, user.user.id);
  if (!isOwner) {
    throw redirect(`/dashboard/${org}/releases`);
  }

  return json({ 
    tenantId: org,
    user: user.user
  });
});

type LoaderData = {
  tenantId: string;
  user: { id: string };
};

export default function ManageTenantCollaborators() {
  const { tenantId, user } = useLoaderData<LoaderData>();
  
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
