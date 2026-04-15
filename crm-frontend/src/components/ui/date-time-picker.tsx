import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [hour, setHour] = React.useState(value ? value.getHours().toString().padStart(2, "0") : "00");
  const [minute, setMinute] = React.useState(value ? value.getMinutes().toString().padStart(2, "0") : "00");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  React.useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setHour(value.getHours().toString().padStart(2, "0"));
      setMinute(value.getMinutes().toString().padStart(2, "0"));
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
      setSelectedDate(newDate);
      onChange?.(newDate);
    } else {
      setSelectedDate(undefined);
      onChange?.(undefined);
    }
  };

  const handleTimeChange = (newHour: string, newMinute: string) => {
    setHour(newHour);
    setMinute(newMinute);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(newHour), parseInt(newMinute), 0, 0);
      setSelectedDate(newDate);
      onChange?.(newDate);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal bg-muted/30 border-muted-foreground/20 hover:bg-muted/50 hover:border-primary/50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM dd, yyyy HH:mm") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex">
          {/* Calendar */}
          <div className="border-r">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </div>
          
          {/* Time Picker */}
          <div className="flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Time
              </div>
            </div>
            <div className="flex divide-x flex-1">
              {/* Hours */}
              <div className="flex flex-col w-14">
                <div className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                  Hr
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1 space-y-0.5">
                    {hours.map((h) => (
                      <Button
                        key={h}
                        variant={hour === h ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full h-8 justify-center text-xs font-medium",
                          hour === h && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => handleTimeChange(h, minute)}
                      >
                        {h}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Minutes */}
              <div className="flex flex-col w-14">
                <div className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                  Min
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1 space-y-0.5">
                    {minutes.map((m) => (
                      <Button
                        key={m}
                        variant={minute === m ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full h-8 justify-center text-xs font-medium",
                          minute === m && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => {
                          handleTimeChange(hour, m);
                        }}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
