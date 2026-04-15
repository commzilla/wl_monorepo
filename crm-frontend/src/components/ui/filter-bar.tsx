import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
}

export function FilterBar({ children, activeFilterCount = 0, className }: FilterBarProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Desktop: render children inline
  if (!isMobile) {
    return (
      <div className={cn("flex flex-wrap items-center gap-4", className)}>
        {children}
      </div>
    );
  }

  // Mobile: collapsed behind a button, opens in a Drawer
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDrawerOpen(true)}
        className={cn("gap-2", className)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
            {activeFilterCount}
          </Badge>
        )}
      </Button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Filters</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
