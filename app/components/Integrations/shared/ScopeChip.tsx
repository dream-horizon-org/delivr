/**
 * Scope Chip Component
 * Displays OAuth scope or permission chips
 */

interface ScopeChipProps {
  scope: string;
}

export function ScopeChip({ scope }: ScopeChipProps) {
  return (
    <code className="bg-gray-200 px-1 rounded text-xs">
      {scope}
    </code>
  );
}

