import { Center, Group, Paper, Stack, Text, Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { GoogleButton } from "~/components/Common/GoogleButton";

type LoginProps = {
  onClickLogin: () => void;
  error?: string | null;
};

export function LoginForm({ onClickLogin, error }: LoginProps) {
  return (
    <Center style={{ minHeight: "100vh" }}>
      <Paper
        radius="md"
        p="xl"
        withBorder
        shadow="md"
        style={{ width: "100%", maxWidth: 400 }}
      >
        <Stack align="center">
          <Text size="xl" fw={700}>
            Welcome to Delivr
          </Text>
          <Text size="sm">Instantly manage your app updates with ease.</Text>
          
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Authentication Error"
              color="red"
              variant="light"
              style={{ width: "100%" }}
            >
              {error}
            </Alert>
          )}
          
          <Group grow mb="md" mt="md">
            <GoogleButton radius="xl" fullWidth onClick={onClickLogin}>
              Continue with Google
            </GoogleButton>
          </Group>
        </Stack>
      </Paper>
    </Center>
  );
}
