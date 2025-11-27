import { Button, Group, rem } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";

interface ReleaseFormActionsProps {
  isUploading: boolean;
  isProcessing: boolean;
  hasDirectory: boolean;
}

export function ReleaseFormActions({ 
  isUploading, 
  isProcessing, 
  hasDirectory 
}: ReleaseFormActionsProps) {
  const isDisabled = isUploading || isProcessing || !hasDirectory;
  
  return (
    <Group justify="flex-end">
        <Button
          type="submit"
          leftSection={<IconRocket style={{ width: rem(16), height: rem(16) }} />}
          loading={isUploading}
          disabled={isDisabled}
          size="md"
        >
          {isUploading ? "Launching Release..." : "Launch Release"}
        </Button>
    </Group>
  );
}
