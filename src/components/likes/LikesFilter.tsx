"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SlidersHorizontal } from "lucide-react";

interface FilterProps {
  sortBy: string;
  setSortBy: (v: string) => void;
  filterMode: string;
  setFilterMode: (v: string) => void;
}

export function LikesFilter({ sortBy, setSortBy, filterMode, setFilterMode }: FilterProps) {
  return (
    <Drawer>
      <DrawerTitle />
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className=" gap-2 text-xs border-border bg-muted/50">
          <SlidersHorizontal className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <div className="p-4 pb-0 space-y-6">

            {/* SORTING */}
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Sort By</Label>
              <RadioGroup value={sortBy} onValueChange={setSortBy} className="grid grid-cols-3 gap-2">
                <div>
                  <RadioGroupItem value="date" id="date" className="peer sr-only" />
                  <Label
                    htmlFor="date"
                    className="flex flex-col items-center justify-between rounded-md border border-border bg-card p-2 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                  >
                    Liked date
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="year" id="year" className="peer sr-only" />
                  <Label
                    htmlFor="year"
                    className="flex flex-col items-center justify-between rounded-md border border-border bg-card p-2 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                  >
                    Year
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="rating" id="rating" className="peer sr-only" />
                  <Label
                    htmlFor="rating"
                    className="flex flex-col items-center justify-between rounded-md border border-border bg-card p-2 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                  >
                    Rating
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* FILTERING */}
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Show Content</Label>
              <RadioGroup value={filterMode} onValueChange={setFilterMode} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="f-all" className="text-primary" />
                  <Label htmlFor="f-all">Everything</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="session" id="f-session" className="text-primary" />
                  <Label htmlFor="f-session">Sessions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="solo" id="f-solo" className="text-primary" />
                  <Label htmlFor="f-solo">Solo</Label>
                </div>
              </RadioGroup>
            </div>

          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}