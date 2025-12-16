/**
 * StatusIcon - Displays icon based on build upload status
 */

import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { BuildUploadStatus } from '~/types/distribution.types';

type StatusIconProps = {
  status: BuildUploadStatus | null;
};

export function StatusIcon({ status }: StatusIconProps) {
  if (!status) {
    return <IconClock size={16} className="text-gray-400" />;
  }

  switch (status) {
    case BuildUploadStatus.UPLOADED:
      return <IconCheck size={16} className="text-green-500" />;
    case BuildUploadStatus.UPLOADING:
      return <IconClock size={16} className="text-blue-500" />;
    case BuildUploadStatus.FAILED:
      return <IconX size={16} className="text-red-500" />;
    case BuildUploadStatus.PENDING:
    default:
      return <IconClock size={16} className="text-gray-400" />;
  }
}

