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
} from "@mantine/core";
import { IconTrash, IconUserPlus, IconCrown, IconUser } from "@tabler/icons-react";

import { useGetAppCollaboratorList } from "./hooks/useGetAppCollaboratorList";
import { useUpdateCollabarator } from "./hooks/useUpdateCollabarator";
import { useRemoveCollabarator } from "./hooks/useRemoveCollabarator";
import { AddCollboratorForm } from "../AddCollboratorForm";
import { useParams } from "@remix-run/react";
import { Collaborator } from "./data/getAppCollaborator";
import { CTAButton } from "~/components/CTAButton";

const getInitials = (name: string) => {
  const parts = name.split("@")[0].split(".");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColorFromTheme = (name: string, theme: any) => {
  const colors = [
    theme.other.brand.primary,
    theme.other.brand.secondary,
    theme.other.brand.primaryDark,
    theme.other.brand.tertiary,
    theme.other.brand.quaternary,
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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
            <Skeleton key={i} height={100} radius="md" />
          ))}
      </Stack>
    );
  }

  if (!data?.length) {
    return (
      <Card withBorder padding="xl" radius="md" style={{ textAlign: "center" }}>
        <Stack gap="md" align="center">
          <IconUser size={theme.other.sizes.avatar.md} color={theme.other.text.disabled} />
          <Text size="lg" fw={theme.other.typography.fontWeight.medium} c="dimmed">
            No Collaborators Yet
          </Text>
          <Text size="sm" c="dimmed">
            Add team members to collaborate on this app
          </Text>
          <CTAButton
            leftSection={<IconUserPlus size={theme.other.sizes.icon.lg} />}
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
        <Table horizontalSpacing="lg" verticalSpacing="md" highlightOnHover>
          <Table.Thead style={{ backgroundColor: theme.other.backgrounds.secondary }}>
            <Table.Tr>
              <Table.Th>
                <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.secondary}>
                  Collaborator
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.secondary}>
                  Role
                </Text>
              </Table.Th>
              <Table.Th>
                <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.secondary}>
                  Permission
                </Text>
              </Table.Th>
              <Table.Th style={{ width: 100 }}>
                <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.secondary}>
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

  const initials = getInitials(collaborator.name);
  const avatarColor = getAvatarColorFromTheme(collaborator.name, theme);

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
        <Group gap="md" wrap="nowrap">
          <Box
            style={{
              width: theme.other.sizes.avatar.sm,
              height: theme.other.sizes.avatar.sm,
              borderRadius: theme.other.borderRadius.full,
              background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColor}dd 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.other.shadows.sm,
              flexShrink: 0,
            }}
          >
            <Text size="xs" fw={theme.other.typography.fontWeight.bold} c="white">
              {initials}
            </Text>
          </Box>
          <Text fw={theme.other.typography.fontWeight.medium} size="sm" style={{ wordBreak: "break-all" }}>
            {collaborator.name}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        {collaborator.permission === "Owner" ? (
          <Badge
            leftSection={<IconCrown size={12} />}
            variant="light"
            style={{
              backgroundColor: theme.other.brand.light,
              color: theme.other.brand.primaryDark,
            }}
            size="sm"
          >
            Owner
          </Badge>
        ) : (
          <Badge 
            variant="light" 
            style={{
              backgroundColor: theme.other.brand.light,
              color: theme.other.brand.primaryDark,
            }}
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
          size="sm"
          styles={{
            input: {
              borderColor: theme.other.borders.primary,
              "&:focus": {
                borderColor: theme.other.brand.primary,
              },
            },
          }}
        />
      </Table.Td>
      <Table.Td>
        <Tooltip label="Remove Collaborator">
          <ActionIcon
            variant="light"
            color="red"
            size="md"
            onClick={handleDelete}
            loading={isDeleting}
            disabled={isLoading}
          >
            <IconTrash size={theme.other.sizes.icon.md} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  );
}
