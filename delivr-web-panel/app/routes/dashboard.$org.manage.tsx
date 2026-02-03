import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { Container, Title, Text, Paper } from "@mantine/core";
import { TenantCollaboratorsPage } from "~/components/Pages/components/TenantCollaborators";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { PermissionService } from "~/utils/permissions.server";

export const loader = authenticateLoaderRequest(async ({ params, user }) => {
  const { org } = params;
  
  if (!org) {
    throw new Response("Organization not found", { status: 404 });
  }

  // Validate user object
  if (!user || !user.user || !user.user.id) {
    console.error('[ManageTeam] Invalid user object:', user);
    throw redirect(`/dashboard/${org}/releases`);
  }

  // Check if user is owner - only owners can manage team
  try {
    const isOwner = await PermissionService.isAppOwner(org, user.user.id);
    if (!isOwner) {
      throw redirect(`/dashboard/${org}/releases`);
    }
  } catch (error) {
    // If error is already a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }
    console.error('[ManageTeam] Permission check failed:', error);
    throw redirect(`/dashboard/${org}/releases`);
  }

  return json({ 
    appId: org,
    user: user.user
  });
});

type LoaderData = {
  appId: string;
  user: { id: string };
};

export default function ManageTenantCollaborators() {
  const { appId, user } = useLoaderData<LoaderData>();
  
  // Safety check - redirect if user data is missing
  if (!user || !user.id) {
    return (
      <Container size="xl" py="xl">
        <Paper shadow="sm" p="xl" radius="md">
          <Text c="red">Error: User information not available. Please try refreshing the page.</Text>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <Title order={2} mb="md">Team Members</Title>
        <Text c="dimmed" size="sm" mb="xl">
          Manage your organization's team members and their permissions
        </Text>
        
        <TenantCollaboratorsPage appId={appId} userId={user.id} />
      </Paper>
    </Container>
  );
}
