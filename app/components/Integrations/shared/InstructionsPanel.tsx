/**
 * Instructions Panel Component
 * Reusable panel for displaying setup instructions
 */

interface Instruction {
  text: string;
  link?: string;
  linkText?: string;
}

interface InstructionsPanelProps {
  title: string;
  instructions: (string | Instruction)[];
  className?: string;
}

export function InstructionsPanel({ 
  title, 
  instructions,
  className = 'bg-gray-50'
}: InstructionsPanelProps) {
  return (
    <div className={`${className} rounded-lg p-4 text-sm`}>
      <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
      <ol className="text-gray-600 space-y-1 list-decimal list-inside">
        {instructions.map((instruction, index) => {
          if (typeof instruction === 'string') {
            return <li key={index}>{instruction}</li>;
          }
          
          return (
            <li key={index}>
              {instruction.text}
              {instruction.link && instruction.linkText && (
                <a 
                  href={instruction.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 underline"
                >
                  {instruction.linkText}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}


