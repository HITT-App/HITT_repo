import { HelpCircle } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface SelectOptionsCardProps {
  options?: Option[];
  onSelect?: (option: Option) => void;
}

const defaultOptions: Option[] = [
  { id: '1', label: 'What is muscle building?' },
  { id: '2', label: 'How to build muscle' },
  { id: '3', label: 'Muscle Hypertrophy 101' },
  { id: '4', label: 'Muscle Nutrition' },
];

export function SelectOptionsCard({ options = defaultOptions, onSelect }: SelectOptionsCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Select Options</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect?.(option)}
            className="px-3 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
