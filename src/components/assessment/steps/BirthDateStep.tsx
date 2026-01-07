import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BirthDateStepProps {
  value: { month: string; day: string; year: string };
  onChange: (value: { month: string; day: string; year: string }) => void;
  onContinue: () => void;
}

export const BirthDateStep = ({ value, onChange, onContinue }: BirthDateStepProps) => {
  const [open, setOpen] = useState(false);
  
  // Convert value to Date object
  const getDateFromValue = () => {
    if (value.month && value.day && value.year) {
      const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(value.month);
      if (monthIndex !== -1) {
        return new Date(parseInt(value.year), monthIndex, parseInt(value.day));
      }
    }
    return undefined;
  };

  const date = getDateFromValue();
  const isComplete = value.month && value.day && value.year;

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      onChange({
        month: months[selectedDate.getMonth()],
        day: String(selectedDate.getDate()).padStart(2, "0"),
        year: String(selectedDate.getFullYear()),
      });
      setOpen(false);
    }
  };

  // Calculate age
  const calculateAge = () => {
    if (!date) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          When were you born?
        </h1>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-14 text-lg",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-3 h-5 w-5" />
              {date ? format(date, "MMMM d, yyyy") : <span>Select your birth date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={(date) =>
                date > new Date() || date < new Date("1920-01-01")
              }
              defaultMonth={date || new Date(2000, 0)}
              captionLayout="dropdown-buttons"
              fromYear={1920}
              toYear={new Date().getFullYear()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {age !== null && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            I'm {age} years of age
          </p>
        )}
      </div>

      {/* Continue Button */}
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
