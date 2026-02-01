import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Sparkles } from "lucide-react";
import { MovieListItem } from "../movie/MovieListItem";
import { MediaItem } from "@/types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";

interface MatchesListProps {
  activeCode?: string;
  matches?: MediaItem[];
  openMovie: (id: string) => void;
}

export function MatchesList({ activeCode, matches, openMovie }: MatchesListProps) {
  return (
    <div className="mt-4">
      <h3 className="font-bold mb-1 flex items-center justify-between text-muted-foreground uppercase tracking-wider text-xs">
        Matches Found
        {(matches?.length ?? 0) > 0 && (
          <Badge variant="secondary">{matches?.length}</Badge>
        )}
      </h3>
      <ScrollArea className="h-[calc(100svh-350px)] pr-4 -mr-4 relative">
        {!activeCode ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UserPlus />
                </EmptyMedia>
                <EmptyTitle className="text-foreground">
                  Not in a session
                </EmptyTitle>
                <EmptyDescription>
                  Create or join a session get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <>
            {matches?.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Sparkles />
                    </EmptyMedia>
                    <EmptyTitle className="text-foreground">
                      No matches made yet
                    </EmptyTitle>
                    <EmptyDescription>
                      Start swiping together and see matches here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
            <div className="pt-6 pb-22">
              {matches?.map((movie: MediaItem) => (
                <MovieListItem
                  key={movie.Id}
                  movie={{ ...movie, isMatch: true } as any}
                  onClick={() => openMovie(movie.Id)}
                  variant="condensed"
                />
              ))}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
