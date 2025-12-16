/**
 * StatusIcon - Displays icon based on build upload status
 */

import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { DIST_ICON_SIZES } from '~/constants/distribution/distribution-design.constants';
import { BuildUploadStatus } from '~/types/distribution/distribution.types';

export type StatusIconProps = {
  status: BuildUploadStatus | null;
};

export function StatusIcon({ status }: StatusIconProps) {
  if (!status) {
    return <IconClock size={DIST_ICON_SIZES.MD} className="text-gray-400" />;
  }

  switch (status) {
    case BuildUploadStatus.UPLOADED:
      return <IconCheck size={DIST_ICON_SIZES.MD} className="text-green-500" />;
    case BuildUploadStatus.UPLOADING:
      return <IconClock size={DIST_ICON_SIZES.MD} className="text-blue-500" />;
    case BuildUploadStatus.FAILED:
      return <IconX size={DIST_ICON_SIZES.MD} className="text-red-500" />;
    case BuildUploadStatus.PENDING:
    default:
      return <IconClock size={DIST_ICON_SIZES.MD} className="text-gray-400" />;
  }
}

