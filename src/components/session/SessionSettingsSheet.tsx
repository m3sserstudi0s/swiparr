"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { RotateCcw, Users, Heart, X, Sparkles, TrendingUp, BarChart3, Infinity } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { SessionSettings, SessionStats } from "@/types/swiparr";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";

interface SessionSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: SessionSettings | null;
  onSave: (settings: SessionSettings) => void;
}

export function SessionSettingsSheet({
  open,
  onOpenChange,
  currentSettings,
  onSave,
}: SessionSettingsSheetProps) {
  const [matchStrategy, setMatchStrategy] = useState<"atLeastTwo" | "allMembers">("atLeastTwo");
  const [maxLeftSwipes, setMaxLeftSwipes] = useState<number>(100);
  const [maxRightSwipes, setMaxRightSwipes] = useState<number>(100);
  const [maxMatches, setMaxMatches] = useState<number>(10);

  // Use a ref to store current values for the auto-save on close
  const valuesRef = useRef({ matchStrategy, maxLeftSwipes, maxRightSwipes, maxMatches });
  const wasOpenRef = useRef(false);

  useEffect(() => {
    valuesRef.current = { matchStrategy, maxLeftSwipes, maxRightSwipes, maxMatches };
  }, [matchStrategy, maxLeftSwipes, maxRightSwipes, maxMatches]);

  const { data: stats, refetch: refetchStats } = useQuery<SessionStats>({
    queryKey: ["session-stats"],
    queryFn: async () => {
      const res = await axios.get("/api/session/stats");
      return res.data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setMatchStrategy(currentSettings?.matchStrategy || "atLeastTwo");
      setMaxLeftSwipes(currentSettings?.maxLeftSwipes || 100);
      setMaxRightSwipes(currentSettings?.maxRightSwipes || 100);
      setMaxMatches(currentSettings?.maxMatches || 10);
      refetchStats();
    }
  }, [open, currentSettings, refetchStats]);

  const handleSave = () => {
    const { matchStrategy, maxLeftSwipes, maxRightSwipes, maxMatches } = valuesRef.current;

    const newSettings = {
      matchStrategy,
      maxLeftSwipes: maxLeftSwipes < 100 ? maxLeftSwipes : undefined,
      maxRightSwipes: maxRightSwipes < 100 ? maxRightSwipes : undefined,
      maxMatches: maxMatches < 10 ? maxMatches : undefined,
    };

    const current = (currentSettings || {}) as SessionSettings;
    const hasChanged =
      newSettings.matchStrategy !== (current.matchStrategy || "atLeastTwo") ||
      (newSettings.maxLeftSwipes || 100) !== (current.maxLeftSwipes || 100) ||
      (newSettings.maxRightSwipes || 100) !== (current.maxRightSwipes || 100) ||
      (newSettings.maxMatches || 10) !== (current.maxMatches || 10);

    if (hasChanged) {
      onSave(newSettings);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && wasOpenRef.current) {
      handleSave();
      wasOpenRef.current = false;
    }
    onOpenChange(newOpen);
  };


  const resetAll = () => {
    setMatchStrategy("atLeastTwo");
    setMaxLeftSwipes(100);
    setMaxRightSwipes(100);
    setMaxMatches(10);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col p-0">
        <SheetHeader className="border-b p-6 shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Session
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="flex flex-col gap-8 pt-6 pb-12 px-6">

            {/* Statistics Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                Stats
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-muted/30 border-none gap-0">
                  <CardHeader>Me</CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono">{stats?.mySwipes.right || 0}</span>
                      <span className="text-xs text-muted-foreground">likes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="size-3 text-primary" />
                      <span>
                        <span className="font-mono">{stats?.myLikeRate.toFixed(0) || 0}</span>
                        % like rate
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-none gap-0">
                  <CardHeader className="flex flex-row items-center gap-0 mb-2">
                    Group
                    <Badge variant='outline' className="font-mono scale-75">AVERAGE</Badge>
                    </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono"><span className="text-lg font-sans font-normal">~ </span>{(stats?.avgSwipes.right || 0).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">likes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      <span>
                        <span className="font-mono">{stats?.avgLikeRate.toFixed(0) || 0}</span>
                        % like rate
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="py-4 px-5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Activity</p>
                  <p className="text-xs text-muted-foreground">Total swipes</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-lg font-black text-primary font-mono">{stats?.totalSwipes.right || 0}</p>
                    <Heart className="size-3 mx-auto fill-primary text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-muted-foreground font-mono">{stats?.totalSwipes.left || 0}</p>
                    <X className="size-3 mx-auto" />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-muted" />

            {/* Match Strategy */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Matches</Label>
              <RadioGroup
                value={matchStrategy}
                onValueChange={(val) => setMatchStrategy(val as any)}
                className="grid grid-cols-1 gap-3"
              >
                <div className="flex items-center space-x-3 rounded-xl border p-4 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary transition-colors cursor-pointer" onClick={() => setMatchStrategy("atLeastTwo")}>
                  <RadioGroupItem value="atLeastTwo" id="atLeastTwo" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="atLeastTwo" className="font-bold cursor-pointer">Two or more</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A match occurs as soon as at least two members have liked the same movie.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 rounded-xl border p-4 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary transition-colors cursor-pointer" onClick={() => setMatchStrategy("allMembers")}>
                  <RadioGroupItem value="allMembers" id="allMembers" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="allMembers" className="font-bold cursor-pointer">Unanimous</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Every single member in the session must like the movie for it to be a match.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <hr className="border-muted" />

            {/* Restrictions */}
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Restrictions</Label>
                <Label className="text-xs text-muted-foreground">Try these settings to speed up or tweak your session experience.</Label>
              </div>
              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-semibold">Likes</Label>
                      <p className="text-xs text-muted-foreground">Max right swipes per user</p>
                    </div>
                    <span className="text-sm font-semibold bg-muted px-2 py-0.5 rounded-md min-w-10 h-6.5 text-center">
                      {maxRightSwipes === 100 ? <Infinity className="mx-auto mt-0.5 size-4.5"/> : maxRightSwipes}
                    </span>
                  </div>
                  <Slider
                    value={[maxRightSwipes]}
                    min={5}
                    max={100}
                    step={5}
                    onValueChange={(val) => setMaxRightSwipes(val[0])}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-semibold">Nopes</Label>
                      <p className="text-xs text-muted-foreground">Max left swipes per user</p>
                    </div>
                    <span className="text-sm font-semibold bg-muted px-2 py-0.5 rounded-md min-w-10 h-6.5 text-center">
                      {maxLeftSwipes === 100 ? <Infinity className="mx-auto mt-0.5 size-4.5"/> : maxLeftSwipes}
                    </span>
                  </div>
                  <Slider
                    value={[maxLeftSwipes]}
                    min={5}
                    max={100}
                    step={5}
                    onValueChange={(val) => setMaxLeftSwipes(val[0])}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm font-semibold">Matches</Label>
                      <p className="text-xs text-muted-foreground">Max total matches for the session</p>
                    </div>
                    <span className="text-sm font-semibold bg-muted px-2 py-0.5 rounded-md min-w-10 h-6.5 text-center">
                      {maxMatches === 10 ? <Infinity className="mx-auto mt-0.5 size-4.5"/> : maxMatches}
                    </span>
                  </div>
                  <Slider
                    value={[maxMatches]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(val) => setMaxMatches(val[0])}
                  />
                </div>
              </div>
            </div>

            <hr className="border-muted" />

            <Button
              variant="outline"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={resetAll}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
