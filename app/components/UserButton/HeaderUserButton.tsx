import { UnstyledButton, Avatar, Menu, rem, Tooltip, useMantineTheme, Text, Box, Group } from "@mantine/core";
import {
  IconLogout,
  IconKey,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { Form, useNavigate } from "@remix-run/react";
import { User } from "~/.server/services/Auth/Auth.interface";
import { route } from "routes-gen";
import { useState } from "react";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

export type HeaderUserButtonProps = {
  user: User;
};

export function HeaderUserButton({ user }: HeaderUserButtonProps) {
  const navigate = useNavigate();
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);
  const theme = useMantineTheme();
  
  const brandColor = theme.colors?.brand?.[5] || '#14b8a6';
  
  return (
    <>
      <Menu shadow="lg" width={260} position="bottom-end" radius="md">
        <Menu.Target>
          <UnstyledButton>
            <Avatar 
              name={user.user.name} 
              radius="xl" 
              size={36}
              style={{ 
                cursor: "pointer",
                backgroundColor: brandColor,
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
              }}
            />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown p={8}>
          {/* User Info */}
          <Box p="sm" mb={4}>
            <Group gap="sm">
              <Avatar 
                name={user.user.name} 
                radius="xl" 
                size={40}
                style={{ 
                  backgroundColor: brandColor,
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" c="dark.9" truncate>
                  {user.user.name}
                </Text>
                <Tooltip label={user.user.email} position="bottom" withArrow openDelay={300}>
                  <Text size="xs" c="dimmed" truncate style={{ cursor: 'default' }}>
                    {user.user.email}
                  </Text>
                </Tooltip>
              </Box>
            </Group>
          </Box>
          
          <Menu.Divider />
          
          <Menu.Item
            leftSection={<IconKey size={16} />}
            onClick={() => navigate(route("/dashboard/tokens"))}
            py={10}
          >
            API Tokens
          </Menu.Item>
          
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteModalData({ type: 'profile' })}
            py={10}
          >
            Delete Account
          </Menu.Item>
          
          <Menu.Divider />
          
          <Form method="post" action="/logout">
            <Menu.Item
              component="button"
              type="submit"
              color="red"
              leftSection={<IconLogout size={16} />}
              py={10}
              style={{ width: '100%' }}
            >
              Sign Out
            </Menu.Item>
          </Form>
        </Menu.Dropdown>
      </Menu>

      {/* Delete Account Modal */}
      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => navigate('/login')}
      />
    </>
  );
}
