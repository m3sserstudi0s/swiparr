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

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

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
              <ToggleGroup type="single" value={sortBy} onValueChange={setSortBy} className="grid grid-flow-col w-full">
                <ToggleGroupItem value="date" aria-label="Toggle date">
                  Added
                </ToggleGroupItem>
                <ToggleGroupItem value="year" aria-label="Toggle year">
                  Year
                </ToggleGroupItem>
                <ToggleGroupItem value="rating" aria-label="Toggle rating">
                  Rating
                </ToggleGroupItem>
                <ToggleGroupItem value="likes" aria-label="Toggle likes">
                  Likes
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* FILTERING */}
            <div className="space-y-3">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Filter</Label>
              <RadioGroup value={filterMode} onValueChange={setFilterMode} className="flex ml-1 flex-col space-y-1">
                <div className="flex items-center space-x-4">
                  <RadioGroupItem value="all" id="f-all" className="text-primary scale-150" />
                  <Label htmlFor="f-all" className="text-lg">Everything</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <RadioGroupItem value="session" id="f-session" className="text-primary scale-150" />
                  <Label htmlFor="f-session" className="text-lg">Sessions</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <RadioGroupItem value="solo" id="f-solo" className="text-primary scale-150" />
                  <Label htmlFor="f-solo" className="text-lg">Solo</Label>
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