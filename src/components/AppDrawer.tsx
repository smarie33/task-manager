"use client";

import React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const AppDrawer: React.FC<AppDrawerProps> = ({
  open,
  onOpenChange,
  title = "Details",
  children,
  className,
}) => {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 h-full w-[30vw] min-w-[320px] max-w-[640px] border-l bg-background shadow-xl",
            className
          )}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <DrawerPrimitive.Close asChild>
              <Button variant="ghost" size="sm">Close</Button>
            </DrawerPrimitive.Close>
          </div>
          <div className="p-4 overflow-auto h-[calc(100%-3rem)]">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
};

export default AppDrawer;