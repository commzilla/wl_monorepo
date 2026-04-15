import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.month || new Date()
  );

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = currentMonth.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  const handleMonthChange = (month: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(months.indexOf(month));
    setCurrentMonth(newMonth);
    props.onMonthChange?.(newMonth);
  };

  const handleYearChange = (year: string) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(year));
    setCurrentMonth(newMonth);
    props.onMonthChange?.(newMonth);
  };

  React.useEffect(() => {
    if (props.month) {
      setCurrentMonth(props.month);
    }
  }, [props.month]);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto", className)}
      month={currentMonth}
      onMonthChange={setCurrentMonth}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-background/50 backdrop-blur-sm p-0 border-border/40 transition-all duration-300 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-110 hover:shadow-sm"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground/80 rounded-md w-10 font-semibold text-[0.75rem] uppercase tracking-wider",
        row: "flex w-full mt-2",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-blue-500/20 [&:has([aria-selected])]:bg-gradient-to-br [&:has([aria-selected])]:from-blue-500/20 [&:has([aria-selected])]:to-blue-500/10 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20 transition-colors duration-200",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-medium aria-selected:opacity-100 rounded-lg transition-all duration-300 hover:bg-blue-500/10 hover:scale-110 hover:font-semibold active:scale-95"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 focus:from-blue-600 focus:to-blue-700 font-semibold border border-blue-400/20",
        day_today: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 font-semibold border border-blue-300/50 shadow-sm dark:from-blue-900/40 dark:to-blue-800/40 dark:text-blue-100 dark:border-blue-600/30",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-40 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30 hover:opacity-60",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100",
        day_range_middle:
          "aria-selected:bg-gradient-to-br aria-selected:from-blue-500/20 aria-selected:to-blue-500/10 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: ({ displayMonth }) => (
          <div className="flex justify-center items-center gap-2 mb-2">
            <Select
              value={months[displayMonth.getMonth()]}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[110px] h-8 text-sm font-semibold bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {months.map((month) => (
                  <SelectItem key={month} value={month} className="text-sm">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={displayMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[85px] h-8 text-sm font-semibold bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pointer-events-auto max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
