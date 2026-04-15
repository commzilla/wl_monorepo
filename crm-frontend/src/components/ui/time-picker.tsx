import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  className?: string;
}

export function TimePicker({ value = "00:00", onChange, className }: TimePickerProps) {
  const [hour, setHour] = React.useState(value.split(":")[0] || "00");
  const [minute, setMinute] = React.useState(value.split(":")[1] || "00");
  const [open, setOpen] = React.useState(false);
  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minuteScrollRef = React.useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const handleTimeChange = (newHour: string, newMinute: string) => {
    setHour(newHour);
    setMinute(newMinute);
    onChange?.(`${newHour}:${newMinute}`);
  };

  React.useEffect(() => {
    if (open) {
      // Scroll to selected hour
      setTimeout(() => {
        const hourElement = hourScrollRef.current?.querySelector(`[data-hour="${hour}"]`);
        hourElement?.scrollIntoView({ block: "center", behavior: "smooth" });
        
        const minuteElement = minuteScrollRef.current?.querySelector(`[data-minute="${minute}"]`);
        minuteElement?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
    }
  }, [open, hour, minute]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal transition-all duration-300 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-105",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Select time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex divide-x bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
          {/* Hours */}
          <div className="flex flex-col w-20">
            <div className="p-3 text-center text-sm font-semibold border-b bg-gradient-to-br from-blue-500/10 to-blue-500/5 sticky top-0 z-10">
              Hour
            </div>
            <ScrollArea className="h-[240px]" ref={hourScrollRef}>
              <div className="p-1 space-y-0.5">
                {hours.map((h) => (
                  <Button
                    key={h}
                    data-hour={h}
                    variant={hour === h ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full h-9 justify-center transition-all duration-200 text-sm font-medium",
                      hour === h
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 font-semibold scale-105"
                        : "hover:bg-blue-500/10 hover:scale-105"
                    )}
                    onClick={() => {
                      handleTimeChange(h, minute);
                    }}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Minutes */}
          <div className="flex flex-col w-20">
            <div className="p-3 text-center text-sm font-semibold border-b bg-gradient-to-br from-blue-500/10 to-blue-500/5 sticky top-0 z-10">
              Min
            </div>
            <ScrollArea className="h-[240px]" ref={minuteScrollRef}>
              <div className="p-1 space-y-0.5">
                {minutes.map((m) => (
                  <Button
                    key={m}
                    data-minute={m}
                    variant={minute === m ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full h-9 justify-center transition-all duration-200 text-sm font-medium",
                      minute === m
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 font-semibold scale-105"
                        : "hover:bg-blue-500/10 hover:scale-105"
                    )}
                    onClick={() => {
                      handleTimeChange(hour, m);
                      setOpen(false);
                    }}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
