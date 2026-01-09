/**
 * ConfigurationsModals Component
 * Handles all confirmation modals for configuration actions
 */

import { memo } from 'react';
import { ConfirmationModal } from '~/components/Common/ConfirmationModal';
import { CONFIG_STATUSES } from '~/types/release-config-constants';
import type { ReleaseConfiguration } from '~/types/release-config';

export interface ConfigurationsModalsProps {
  archiveModal: { opened: boolean; configId: string | null };
  unarchiveModal: { opened: boolean; configId: string | null };
  deleteModal: { opened: boolean; configId: string | null };
  configurations: ReleaseConfiguration[];
  isProcessing: boolean;
  onArchiveConfirm: () => void;
  onUnarchiveConfirm: () => void;
  onDeleteConfirm: () => void;
  onArchiveClose: () => void;
  onUnarchiveClose: () => void;
  onDeleteClose: () => void;
}

export const ConfigurationsModals = memo(function ConfigurationsModals({
  archiveModal,
  unarchiveModal,
  deleteModal,
  configurations,
  isProcessing,
  onArchiveConfirm,
  onUnarchiveConfirm,
  onDeleteConfirm,
  onArchiveClose,
  onUnarchiveClose,
  onDeleteClose,
}: ConfigurationsModalsProps) {
  // Archive Modal
  const archiveConfig = archiveModal.configId
    ? configurations.find((c) => c.id === archiveModal.configId)
    : null;
  const isDraft = archiveConfig?.status === CONFIG_STATUSES.DRAFT;

  // Unarchive Modal
  const unarchiveConfig = unarchiveModal.configId
    ? configurations.find((c) => c.id === unarchiveModal.configId)
    : null;

  // Delete Modal
  const deleteConfig = deleteModal.configId
    ? configurations.find((c) => c.id === deleteModal.configId)
    : null;

  return (
    <>
      {/* Archive Confirmation Modal */}
      {archiveModal.configId && archiveConfig && (
        <ConfirmationModal
          opened={archiveModal.opened}
          onClose={onArchiveClose}
          onConfirm={onArchiveConfirm}
          title={isDraft ? 'Delete Draft Configuration' : 'Archive Configuration'}
          message={
            isDraft
              ? 'Are you sure you want to delete this draft configuration? This action cannot be undone.'
              : `Are you sure you want to archive "${archiveConfig.name}"? You can unarchive it later if needed.`
          }
          confirmLabel={isDraft ? 'Delete' : 'Archive'}
          cancelLabel="Cancel"
          confirmColor={isDraft ? 'red' : 'orange'}
          isLoading={isProcessing}
        />
      )}

      {/* Unarchive Confirmation Modal */}
      {unarchiveModal.configId && unarchiveConfig && (
        <ConfirmationModal
          opened={unarchiveModal.opened}
          onClose={onUnarchiveClose}
          onConfirm={onUnarchiveConfirm}
          title="Unarchive Configuration"
          message={`Are you sure you want to unarchive "${unarchiveConfig.name}"? It will be restored to active status.`}
          confirmLabel="Unarchive"
          cancelLabel="Cancel"
          confirmColor="blue"
          isLoading={isProcessing}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.configId && deleteConfig && (
        <ConfirmationModal
          opened={deleteModal.opened}
          onClose={onDeleteClose}
          onConfirm={onDeleteConfirm}
          title="Delete Configuration"
          message={`Are you sure you want to permanently delete "${deleteConfig.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmColor="red"
          isLoading={isProcessing}
        />
      )}
    </>
  );
});

