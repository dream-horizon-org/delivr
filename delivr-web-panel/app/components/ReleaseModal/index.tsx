import { Modal, Button, Group, Text, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { ReleaseForm } from "~/components/Pages/components/ReleaseForm/ReleaseForm";
import classes from "./index.module.css";

interface ReleaseModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ReleaseModal({ opened, onClose }: ReleaseModalProps) {
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      openConfirm();
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setHasUnsavedChanges(false);
    closeConfirm();
    onClose();
  };

  const handleSuccess = () => {
    setHasUnsavedChanges(false);
    onClose();
  };

  return (
    <>
      {/* Main Release Modal */}
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Create Release"
        size="xl"
        centered
        classNames={{
          header: classes.modalHeader,
          title: classes.modalTitle,
        }}
        closeOnClickOutside={!hasUnsavedChanges}
        closeOnEscape={!hasUnsavedChanges}
      >
        <ReleaseForm
          onFormChange={(isDirty) => setHasUnsavedChanges(isDirty)}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmOpened}
        onClose={closeConfirm}
        title="Unsaved Changes"
        centered
        size="sm"
        withCloseButton={false}
        classNames={{
          header: classes.confirmHeader,
        }}
      >
        <Stack gap="md">
          <Group gap="sm">
            <IconAlertCircle size={24} color="var(--mantine-color-orange-6)" />
            <Text size="sm">
              You have unsaved changes. Are you sure you want to close this form? All your
              progress will be lost.
            </Text>
          </Group>

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="default" onClick={closeConfirm}>
              Continue Editing
            </Button>
            <Button color="red" onClick={handleConfirmClose}>
              Discard Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

