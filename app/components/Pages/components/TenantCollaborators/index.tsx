import { useState } from "react";
import {
  Table,
  Button,
  Group,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Stack,
  Text,
  Loader,
  Alert,
} from "@mantine/core";
import { IconUserPlus, IconTrash, IconEdit, IconAlertCircle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { notifications } from "@mantine/notifications";
import axios from "axios";

interface Collaborator {
  email: string;
  permission: string;
  accountId: string;
}

interface TenantCollaboratorsPageProps {
  tenantId: string;
  userId: string;
}

export function TenantCollaboratorsPage({ tenantId, userId }: TenantCollaboratorsPageProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  
  const [newEmail, setNewEmail] = useState("");
  const [newPermission, setNewPermission] = useState<string>("Viewer");
  const [editPermission, setEditPermission] = useState<string>("");

  const queryClient = useQueryClient();

  // Fetch collaborators
  const { data: collaborators, isLoading, error } = useQuery<Record<string, Collaborator>>(
    ["tenant-collaborators", tenantId],
    async () => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/collaborators`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to fetch collaborators:", errorData);
        throw new Error(errorData.error || "Failed to fetch collaborators");
      }
      
      const data = await response.json();
      return data.collaborators || {};
    }
  );

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation(
    async ({ email, permission }: { email: string; permission: string }) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, permission }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add collaborator");
      }

      return response.json();
    },
    {
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Collaborator added successfully",
          color: "green",
        });
        queryClient.invalidateQueries(["tenant-collaborators", tenantId]);
        setAddModalOpen(false);
        setNewEmail("");
        setNewPermission("Viewer");
      },
      onError: (error: Error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    }
  );

  // Update collaborator mutation
  const updateCollaboratorMutation = useMutation(
    async ({ email, permission }: { email: string; permission: string }) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/collaborators`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, permission }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update collaborator");
      }

      return response.json();
    },
    {
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Permission updated successfully",
          color: "green",
        });
        queryClient.invalidateQueries(["tenant-collaborators", tenantId]);
        setEditModalOpen(false);
        setSelectedCollaborator(null);
      },
      onError: (error: Error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    }
  );

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation(
    async (email: string) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/collaborators`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove collaborator");
      }

      return response.json();
    },
    {
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Collaborator removed successfully",
          color: "green",
        });
        queryClient.invalidateQueries(["tenant-collaborators", tenantId]);
        setDeleteModalOpen(false);
        setSelectedCollaborator(null);
      },
      onError: (error: Error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    }
  );

  const handleAddCollaborator = () => {
    if (!newEmail.trim()) {
      notifications.show({
        title: "Error",
        message: "Email is required",
        color: "red",
      });
      return;
    }

    addCollaboratorMutation.mutate({ email: newEmail, permission: newPermission });
  };

  const handleUpdateCollaborator = () => {
    if (!selectedCollaborator) return;

    updateCollaboratorMutation.mutate({
      email: selectedCollaborator.email,
      permission: editPermission,
    });
  };

  const handleRemoveCollaborator = () => {
    if (!selectedCollaborator) return;

    removeCollaboratorMutation.mutate(selectedCollaborator.email);
  };

  const openEditModal = (email: string, collab: Collaborator) => {
    setSelectedCollaborator({ ...collab, email });
    setEditPermission(collab.permission);
    setEditModalOpen(true);
  };

  const openDeleteModal = (email: string, collab: Collaborator) => {
    setSelectedCollaborator({ ...collab, email });
    setDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {(error as Error).message}
      </Alert>
    );
  }

  const collaboratorsList = Object.entries(collaborators || {});

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Text size="sm" c="dimmed">
          {collaboratorsList.length} member{collaboratorsList.length !== 1 ? "s" : ""}
        </Text>
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => setAddModalOpen(true)}
        >
          Add Member
        </Button>
      </Group>

      {collaboratorsList.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No collaborators yet. Add your first team member!
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Permission</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {collaboratorsList.map(([email, collab]) => (
              <Table.Tr key={email}>
                <Table.Td>{email}</Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      collab.permission === "Owner"
                        ? "blue"
                        : collab.permission === "Editor"
                        ? "green"
                        : "gray"
                    }
                  >
                    {collab.permission}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {collab.permission !== "Owner" && (
                      <>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => openEditModal(email, collab)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => openDeleteModal(email, collab)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </>
                    )}
                    {collab.permission === "Owner" && (
                      <Text size="xs" c="dimmed">
                        Owner (cannot be modified)
                      </Text>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Add Collaborator Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewEmail("");
          setNewPermission("Viewer");
        }}
        title="Add Team Member"
      >
        <Stack>
          <TextInput
            label="Email Address"
            placeholder="colleague@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
            required
          />
          <Select
            label="Permission"
            value={newPermission}
            onChange={(value) => setNewPermission(value || "Viewer")}
            data={[
              { value: "Editor", label: "Editor - Can create apps and releases" },
              { value: "Viewer", label: "Viewer - Read-only access" },
            ]}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setAddModalOpen(false);
                setNewEmail("");
                setNewPermission("Viewer");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCollaborator}
              loading={addCollaboratorMutation.isLoading}
            >
              Add Member
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Permission Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCollaborator(null);
        }}
        title="Edit Permission"
      >
        <Stack>
          <Text size="sm">
            Editing permission for: <strong>{selectedCollaborator?.email}</strong>
          </Text>
          <Select
            label="Permission"
            value={editPermission}
            onChange={(value) => setEditPermission(value || "Viewer")}
            data={[
              { value: "Editor", label: "Editor - Can create apps and releases" },
              { value: "Viewer", label: "Viewer - Read-only access" },
            ]}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedCollaborator(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCollaborator}
              loading={updateCollaboratorMutation.isLoading}
            >
              Update
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedCollaborator(null);
        }}
        title="Remove Team Member"
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to remove <strong>{selectedCollaborator?.email}</strong> from this
            organization?
          </Text>
          <Text size="xs" c="dimmed">
            They will lose access to all apps and resources in this organization.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedCollaborator(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleRemoveCollaborator}
              loading={removeCollaboratorMutation.isLoading}
            >
              Remove
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

