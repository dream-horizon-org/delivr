/**
 * Form Page Header Component
 * Reusable header for form pages with back button and title
 */

import { memo } from 'react';
import { useNavigate } from '@remix-run/react';
import { IconArrowLeft } from '@tabler/icons-react';

interface FormPageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
}

export const FormPageHeader = memo(function FormPageHeader({
  title,
  description,
  backUrl,
}: FormPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-6">
      {backUrl && (
        <button
          type="button"
          onClick={handleBack}
          className="text-gray-400 hover:text-gray-600"
        >
          <IconArrowLeft size={20} />
        </button>
      )}
      <div>
        <div className="text-lg font-semibold text-gray-700">{title}</div>
        {description && (
          <div className="text-sm text-gray-500">{description}</div>
        )}
      </div>
    </div>
  );
});

