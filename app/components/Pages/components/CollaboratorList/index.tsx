import { useState } from "react";
import {
  Card,
  Stack,
  Group,
  Text,
  Select,
  Skeleton,
  Badge,
  ActionIcon,
  Tooltip,
  Box,
  Table,
  useMantineTheme,
  ThemeIcon,
  Avatar,
} from "@mantine/core";
import { IconTrash, IconUserPlus, IconCrown, IconUsers } from "@tabler/icons-react";

import { useGetAppCollaboratorList } from "./hooks/useGetAppCollaboratorList";
import { useUpdateCollabarator } from "./hooks/useUpdateCollabarator";
import { useRemoveCollabarator } from "./hooks/useRemoveCollabarator";
import { AddCollboratorForm } from "../AddCollboratorForm";
import { useParams } from "@remix-run/react";
import { Collaborator } from "./data/getAppCollaborator";
import { CTAButton } from "~/components/Common/CTAButton";

type CollabaratorListProps = {
  addCollaboratorOpen?: boolean;
  setAddCollaboratorOpen?: (open: boolean) => void;
};

export function CollabaratorList({ 
  addCollaboratorOpen, 
  setAddCollaboratorOpen 
}: CollabaratorListProps = {}) {
  const theme = useMantineTheme();
  const { data, isLoading, isFetching, refetch } = useGetAppCollaboratorList();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  
  const open = addCollaboratorOpen ?? internalOpen;
  const setOpen = setAddCollaboratorOpen ?? setInternalOpen;

  if (isLoading || isFetching) {
    return (
      <Stack gap="md">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
      </Stack>
    );
  }

  if (!data?.length) {
    return (
      <Card withBorder padding="xl" radius="md" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center" py="lg">
          <ThemeIcon size={60} radius="xl" color="gray" variant="light">
            <IconUsers size={30} />
          </ThemeIcon>
          <Box>
            <Text size="lg" fw={600} c={theme.colors.slate[8]} mb={4}>
              No Collaborators Yet
            </Text>
            <Text size="sm" c="dimmed">
              Add team members to collaborate on this app
            </Text>
          </Box>
          <CTAButton
            leftSection={<IconUserPlus size={16} />}
            onClick={() => setOpen(true)}
          >
            Add Collaborator
          </CTAButton>
        </Stack>
      </Card>
    );
  }

  return (
    <>
      <AddCollboratorForm 
        open={open} 
        onClose={() => setOpen(false)} 
        onSuccess={refetch}
      />

      <Card withBorder radius="md" padding={0} style={{ overflow: "hidden" }}>
        <Table horizontalSpacing="md" verticalSpacing="sm" highlightOnHover>
          <Table.Thead style={{ backgroundColor: theme.colors.slate[0] }}>
            <Table.Tr>
              <Table.Th>
                <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                  Collaborator
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                  Role
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                  Permission
                </Text>
              </Table.Th>
              <Table.Th style={{ width: 80 }}>
                <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                  Actions
                </Text>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((collaborator) => (
              <CollaboratorRow
                key={collaborator.name}
                collaborator={collaborator}
                refetch={refetch}
                isLoading={loadingItems.has(collaborator.name)}
                onLoadingChange={(loading) => {
                  setLoadingItems((prev) => {
                    const next = new Set(prev);
                    if (loading) {
                      next.add(collaborator.name);
                    } else {
                      next.delete(collaborator.name);
                    }
                    return next;
                  });
                }}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </>
  );
}

function CollaboratorRow({
  collaborator,
  refetch,
  isLoading,
  onLoadingChange,
}: {
  collaborator: Collaborator;
  refetch: () => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}) {
  const theme = useMantineTheme();
  const params = useParams();
  const { mutate: updatePermission } = useUpdateCollabarator();
  const { mutate: removeCollaborator } = useRemoveCollabarator();
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePermissionChange = (value: string | null) => {
    if (!value) return;
    onLoadingChange(true);
    updatePermission(
      {
        appId: params.app ?? "",
        tenant: params.org ?? "",
        email: collaborator.name,
        role: value as Collaborator["permission"],
      },
      {
        onSuccess: () => {
          refetch();
          onLoadingChange(false);
        },
        onError: () => {
          onLoadingChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    setIsDeleting(true);
    onLoadingChange(true);
    removeCollaborator(
      {
        appId: params.app ?? "",
        tenant: params.org ?? "",
        email: collaborator.name,
      },
      {
        onSuccess: () => {
          refetch();
          setIsDeleting(false);
          onLoadingChange(false);
        },
        onError: () => {
          setIsDeleting(false);
          onLoadingChange(false);
        },
      }
    );
  };

  return (
    <Table.Tr style={{ opacity: isLoading ? 0.5 : 1 }}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            name={collaborator.name}
            color="initials"
            size="sm"
            radius="xl"
          />
          <Text fw={500} size="sm" style={{ wordBreak: "break-all" }}>
            {collaborator.name}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        {collaborator.permission === "Owner" ? (
          <Badge
            leftSection={<IconCrown size={12} />}
            variant="light"
            color="brand"
            size="sm"
          >
            Owner
          </Badge>
        ) : (
          <Badge 
            variant="light" 
            color="gray"
            size="sm"
          >
            Collaborator
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Select
          data={[
            { value: "Owner", label: "Owner" },
            { value: "Collaborator", label: "Collaborator" },
          ]}
          value={collaborator.permission}
          onChange={handlePermissionChange}
          disabled={isLoading}
          size="xs"
          w={140}
        />
      </Table.Td>
      <Table.Td>
        <Tooltip label="Remove Collaborator" withArrow>
          <ActionIcon
            variant="light"
            color="red"
            size="sm"
            onClick={handleDelete}
            loading={isDeleting}
            disabled={isLoading}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}
