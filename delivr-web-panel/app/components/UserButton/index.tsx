import { UnstyledButton, Group, Avatar, Text, rem, Menu, Modal, Button, Stack, useMantineTheme } from "@mantine/core";
import {
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import classes from "./index.module.css";
import { Form, useNavigate } from "@remix-run/react"; // Use Remix's Form for logout action
import { User } from '~/.server/services/Auth/auth.interface';
import { route } from "routes-gen";
import { useState } from "react";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

export type UserButtonProps = {
  user: User;
};

export function UserButton({ user }: UserButtonProps) {
  const navigate = useNavigate();
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const theme = useMantineTheme();

  return (
    <>
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton className={classes.user}>
          <Group>
            <Avatar name={user.user.name} radius="xl" />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                {user.user.name}
              </Text>
              <Text c="dimmed" size="xs">
                {user.user.email}
              </Text>
            </div>
            <IconChevronRight
              style={{ width: rem(14), height: rem(14) }}
              stroke={1.5}
            />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={
            <IconTrash style={{ width: rem(14), height: rem(14) }} />
          }
          onClick={() => {
              setDeleteModalData({ type: 'profile' });
          }}
        >
          Delete Account
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item 
          color="red"
          leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
          onClick={() => setLogoutModalOpen(true)}
        >
          Logout
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={
            <IconSettings style={{ width: rem(14), height: rem(14) }} />
          }
          onClick={() => {
            navigate(route("/dashboard/tokens"));
          }}
        >
          Token List
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>

    {/* Delete Account Modal */}
    <DeleteModal
      opened={!!deleteModalData}
      onClose={() => setDeleteModalData(null)}
      data={deleteModalData}
      onSuccess={() => {
        // Handle account deletion success (e.g., redirect to login)
        navigate('/login');
      }}
    />

    {/* Logout Confirmation Modal */}
    <Modal
      opened={logoutModalOpen}
      onClose={() => setLogoutModalOpen(false)}
      title={
        <Group gap="sm">
          <IconAlertCircle size={24} color={theme.colors.red[6]} />
          <Text fw={600} size="lg">
            Sign Out
          </Text>
        </Group>
      }
      centered
      size="sm"
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Are you sure you want to sign out? You'll need to sign in again to access your account.
        </Text>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={() => setLogoutModalOpen(false)}
          >
            Cancel
          </Button>
          <Form method="post" action="/logout">
            <Button
              type="submit"
              color="red"
              leftSection={<IconLogout size={16} />}
            >
              Sign Out
            </Button>
          </Form>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}
