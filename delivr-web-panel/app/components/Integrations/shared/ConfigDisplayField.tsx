/**
 * Config Display Field Component
 * Reusable component for displaying configuration key-value pairs
 */

interface ConfigDisplayFieldProps {
  label: string;
  value: string | number;
  isMono?: boolean;
  truncate?: boolean;
}

export function ConfigDisplayField({ 
  label, 
  value, 
  isMono = false,
  truncate = false 
}: ConfigDisplayFieldProps) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div 
        className={`text-sm text-gray-900 ${isMono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}
        title={truncate ? String(value) : undefined}
      >
        {value}
      </div>
    </div>
  );
}




