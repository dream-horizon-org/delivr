import { Card, Avatar, Text, Button, Flex } from "@mantine/core";
import classes from "./index.module.css";
import { useNavigate } from "@remix-run/react";
import { AppCardResponse } from "../Pages/components/AppList/data/getAppListForOrg";
import { IconTrash } from "@tabler/icons-react";

export type AppCardProps = Omit<AppCardResponse, "role"> & {
  link: string;
  deleteLink?: string; // Deprecated - use onDelete instead
  onDelete?: () => void; // New - state-based delete handler
};

export function AppCard({
  name,
  description,
  link,
  deleteLink,
  onDelete,
  isAdmin,
}: AppCardProps) {
  const navigate = useNavigate();

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else if (deleteLink) {
      // Fallback to route-based delete for backward compatibility
      navigate(deleteLink);
    }
  };

  return (
    <Card withBorder padding="xl" radius="md" className={classes.card}>
      <Card.Section h={100} />
      <Avatar
        key={name}
        name={name}
        color="initials"
        size={80}
        radius={80}
        mx="auto"
        mt={-30}
        className={classes.avatar}
      />
      <Text ta="center" fz="lg" fw={500} mt="sm">
        {name}
      </Text>
      <Text ta="center" fz="sm" c="dimmed">
        {description}
      </Text>
      {/* <Group mt="md" justify="center" gap={30}>
        {items}
      </Group> */}
      <Flex justify={"space-between"} align={"center"}>
        <Button
          fullWidth
          radius="md"
          mt="xl"
          size="md"
          onClick={() => {
            navigate(link);
          }}
        >
          Go To App
        </Button>
        {isAdmin && (onDelete || deleteLink) && (
          <Button
            radius="md"
            mt="xl"
            mx={"sm"}
            size="md"
            onClick={handleDelete}
            color="red"
            variant="light"
          >
            <IconTrash />
          </Button>
        )}
      </Flex>
    </Card>
  );
}
