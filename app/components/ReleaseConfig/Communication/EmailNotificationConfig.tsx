/**
 * Email Notification Configuration Component
 * Configure email notifications for releases
 */

import { useState } from 'react';
import { Stack, Text, TextInput, Card, Group, Switch, Button, Badge } from '@mantine/core';
import { IconMail, IconPlus, IconX } from '@tabler/icons-react';

interface EmailNotificationConfigProps {
  enabled: boolean;
  emails: string[];
  onToggle: (enabled: boolean) => void;
  onChange: (emails: string[]) => void;
}

export function EmailNotificationConfig({
  enabled,
  emails,
  onToggle,
  onChange,
}: EmailNotificationConfigProps) {
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('Invalid email format');
      return;
    }
    
    if (emails.includes(trimmedEmail)) {
      setEmailError('Email already added');
      return;
    }
    
    onChange([...emails, trimmedEmail]);
    setNewEmail('');
    setEmailError('');
  };
  
  const handleRemoveEmail = (email: string) => {
    onChange(emails.filter(e => e !== email));
  };
  
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group gap="sm" className="mb-3">
        <IconMail size={20} className="text-blue-600" />
        <Text fw={600} size="sm">
          Email Notifications
        </Text>
      </Group>
      
      <Stack gap="md">
        <Switch
          label="Enable Email Notifications"
          description="Send release updates via email"
          checked={enabled}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          size="md"
        />
        
        {enabled && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Text size="sm" fw={500} className="mb-3">
                Notification Recipients
              </Text>
              
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      size="lg"
                      variant="light"
                      rightSection={
                        <IconX
                          size={14}
                          className="cursor-pointer hover:text-red-600"
                          onClick={() => handleRemoveEmail(email)}
                        />
                      }
                      className="pr-1"
                    >
                      {email}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <TextInput
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddEmail();
                    }
                  }}
                  error={emailError}
                  className="flex-1"
                />
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAddEmail}
                >
                  Add
                </Button>
              </div>
              
              {emails.length === 0 && (
                <Text size="xs" c="dimmed" className="mt-2">
                  No email recipients added yet
                </Text>
              )}
            </div>
            
            {emails.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <Text size="sm" fw={500} className="text-green-900">
                  {emails.length} recipient{emails.length > 1 ? 's' : ''} configured
                </Text>
              </div>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

