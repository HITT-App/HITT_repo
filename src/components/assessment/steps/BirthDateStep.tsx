import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthDateStepProps {
  value: { month: string; day: string; year: string };
  onChange: (value: { month: string; day: string; year: string }) => void;
  onContinue: () => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

export const BirthDateStep = ({ value, onChange, onContinue }: BirthDateStepProps) => {
  const isComplete = value.month && value.day && value.year;

  // Get days in selected month
  const getDaysInMonth = () => {
    if (!value.month || !value.year) return 31;
    const monthIndex = months.indexOf(value.month);
    return new Date(parseInt(value.year), monthIndex + 1, 0).getDate();
  };

  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);

  // Calculate age
  const calculateAge = () => {
    if (!value.month || !value.day || !value.year) return null;
    const monthIndex = months.indexOf(value.month);
    const birthDate = new Date(parseInt(value.year), monthIndex, parseInt(value.day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          When were you born?
        </h1>

        <div className="flex gap-3">
          {/* Month */}
          <Select
            value={value.month}
            onValueChange={(v) => onChange({ ...value, month: v })}
          >
            <SelectTrigger className="flex-1 h-14 text-base bg-background">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-60">
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Day */}
          <Select
            value={value.day}
            onValueChange={(v) => onChange({ ...value, day: v })}
          >
            <SelectTrigger className="w-24 h-14 text-base bg-background">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-60">
              {days.map((d) => (
                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select
            value={value.year}
            onValueChange={(v) => onChange({ ...value, year: v })}
          >
            <SelectTrigger className="w-28 h-14 text-base bg-background">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-background max-h-60">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {age !== null && age >= 0 && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            You are {age} years old
          </p>
        )}
      </div>

      <Button
        onClick={onContinue}
        disabled={!isComplete}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
