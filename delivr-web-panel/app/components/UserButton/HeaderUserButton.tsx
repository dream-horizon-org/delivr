import { UnstyledButton, Avatar, Menu, rem, Modal, Text, Flex, Button, Tooltip } from "@mantine/core";
import {
  IconLogout,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { Form, useNavigate } from "@remix-run/react";
import { User } from "~/.server/services/Auth/Auth.interface";
import { route } from "routes-gen";
import { text } from "~/theme";
import { useState } from "react";

export type HeaderUserButtonProps = {
  user: User;
};

export function HeaderUserButton({ user }: HeaderUserButtonProps) {
  const navigate = useNavigate();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  
  return (
    <>
      <Menu shadow="md" width={240} position="bottom-end">
        <Menu.Target>
          <UnstyledButton>
            <Avatar 
              name={user.user.name} 
              radius="xl" 
              size="md"
              style={{ 
                cursor: "pointer",
                backgroundColor: "white",
                color: text.brand,
                border: "2px solid rgba(255, 255, 255, 0.3)",
                fontWeight: 700,
                fontSize: "14px",
              }}
            />
          </UnstyledButton>
        </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label 
          style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          {user.user.name}
        </Menu.Label>
        <Tooltip label={user.user.email} position="bottom" withArrow openDelay={500}>
          <Menu.Label 
            style={{ 
              fontWeight: 400, 
              fontSize: '0.85rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'default'
            }}
          >
            {user.user.email}
          </Menu.Label>
        </Tooltip>
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
          <Menu.Item
            color="red"
            leftSection={
              <IconTrash style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={() => {
              setDeleteModalOpened(true);
            }}
          >
            Delete Account
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red">
            <Form
              method="post"
              action="/logout"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <IconLogout size={14} />
              <button
                type="submit"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  flex: 1,
                  textAlign: "left",
                }}
              >
                Logout
              </button>
            </Form>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Delete Account Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Delete Account"
        centered
      >
        <Text>Are you sure you want to delete your account?</Text>
        <Flex justify={"flex-end"} mt={"lg"} gap="sm">
          <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
            Cancel
          </Button>
          <Button 
            color="red" 
            onClick={() => {
              setDeleteModalOpened(false);
              // Add actual delete logic here if needed
            }}
          >
            Delete
          </Button>
        </Flex>
      </Modal>
    </>
  );
}

