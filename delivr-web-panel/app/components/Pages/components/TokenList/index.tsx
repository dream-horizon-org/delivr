import cx from "clsx";
import { useState } from "react";
import {
  Table,
  Checkbox,
  ScrollArea,
  Group,
  Avatar,
  Text,
  rem,
  Flex,
  Button,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import classes from "./index.module.css";
import { useGetAccessTokenList } from "./hooks/useGetAccessTokenList";
import { CreateTokenForm } from "~/components/Pages/components/CreateTokenForm";
import { useDeleteAccessToken } from "./hooks/useDeleteAccessToken";
import { notifications } from "@mantine/notifications";
import { handleApiError } from "~/utils/handleApiError";

type TokenActionProps = {
  selected: string[];
  refetch: () => void;
};

const TokenAction = ({ selected, refetch }: TokenActionProps) => {
  const theme = useMantineTheme();
  const { mutateAsync } = useDeleteAccessToken();
  const [open, setOpen] = useState(false);
  const numberOfSelected = selected.length;
  const [disable, setDisable] = useState(false);

  const onDelete = async () => {
    try {
      setDisable(true);
      const data = await Promise.allSettled(
        selected.map((item) => {
          return mutateAsync(
            {
              name: item,
            },
            {
              onError: (e) => {
                notifications.show({
                  color: "red",
                  title: `Token Deletion ${item}`,
                  message: handleApiError(
                    e,
                    "Error While Removing Token"
                  ),
                });
              },
            }
          );
        })
      );
      setDisable(false);

      const isFailed = data.filter((item) => item.status === "rejected");

      if (isFailed.length === 0) {
        notifications.show({
          color: "green",
          title: `Token Deletion`,
          message: `${selected.length} token(s) removed successfully!`,
        });
      }
      refetch();
    } catch (e) {
      setDisable(false);
    }
  };

  return (
    <>
      <CreateTokenForm
        open={open}
        onClose={() => {
          setOpen(false);
          refetch();
        }}
      />
      <Group justify="space-between" align="center" mb="xl">
        <Title order={2} c="gray.9" fw={600}>
          {numberOfSelected ? `${numberOfSelected} Token${numberOfSelected > 1 ? 's' : ''} Selected` : "Access Tokens"}
        </Title>
        <Group gap="sm">
          {numberOfSelected > 0 && (
            <Button
              leftSection={<IconTrash size={18} />}
              color="red"
              variant="light"
              loading={disable}
              onClick={onDelete}
              styles={{
                root: {
                  transition: "all 200ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 20px rgba(250, 82, 82, 0.25)",
                  },
                },
              }}
            >
              Delete {numberOfSelected} Token{numberOfSelected > 1 ? 's' : ''}
            </Button>
          )}
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setOpen(true)}
            variant="gradient"
            gradient={{ from: theme.other.brand.primary, to: theme.other.brand.secondary, deg: 135 }}
            styles={{
              root: {
                transition: "all 200ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 20px ${theme.other.brand.primary}35`,
                },
              },
            }}
          >
            Create Token
          </Button>
        </Group>
      </Group>
    </>
  );
};

export function AccessTokenList() {
  const { data, isLoading, isFetching, refetch } = useGetAccessTokenList();
  const [selection, setSelection] = useState<string[]>([]);

  const getRows = () => {
    if (isLoading || isFetching) {
      return (
        <Table.Tr key="no-data">
          <Table.Td colSpan={3}>Loading</Table.Td>
        </Table.Tr>
      );
    }

    if (!data?.length) {
      return (
        <Table.Tr key="no-data">
          <Table.Td colSpan={3}>No Data</Table.Td>
        </Table.Tr>
      );
    }

    return data?.map((item) => {
      const selected = selection.includes(item.name);
      return (
        <Table.Tr
          key={item.id}
          className={cx({ [classes.rowSelected]: selected })}
        >
          <Table.Td>
            <Checkbox
              checked={selection.includes(item.name)}
              onChange={() => toggleRow(item.name)}
            />
          </Table.Td>
          <Table.Td>
            <Group gap="sm">
              <Avatar size={26} radius={26} name={item.name} />
              <Text size="sm" fw={500}>
                {item.name}
              </Text>
            </Group>
          </Table.Td>
          <Table.Td>{item.role}</Table.Td>
        </Table.Tr>
      );
    });
  };

  const toggleRow = (id: string) =>
    setSelection((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

  const toggleAll = () => {
    if (!data) return;
    setSelection((current) =>
      current.length === data.length ? [] : data.map((item) => item.name)
    );
  };

  const rows = getRows();

  return (
    <>
      <TokenAction
        selected={selection}
        refetch={() => {
          setSelection([]);
          refetch();
        }}
      />
      <ScrollArea>
        <Table w={"100%"} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: rem(40) }}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selection.length === data?.length}
                  indeterminate={
                    selection.length > 0 && selection.length !== data?.length
                  }
                />
              </Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Access</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}
