import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRefresh, IconLogout } from '@tabler/icons-react';
import { useNavigate } from '@remix-run/react';

interface AuthErrorFallbackProps {
  message: string;
}

export function AuthErrorFallback({ message }: AuthErrorFallbackProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Call logout API to clear session
    await fetch('/logout', { method: 'POST' });
    navigate('/login');
  };

  const handleRetry = () => {
    // Reload the page to retry
    window.location.reload();
  };

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Authentication Failed"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleRetry}
            variant="light"
          >
            Retry
          </Button>
          <Button
            leftSection={<IconLogout size={16} />}
            onClick={handleLogout}
            color="red"
            variant="light"
          >
            Logout
          </Button>
        </div>
      </Stack>
    </Alert>
  );
}

