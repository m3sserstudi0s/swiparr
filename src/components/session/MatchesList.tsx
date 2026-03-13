import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Sparkles, Download, Check } from "lucide-react";
import { MovieListItem } from "../movie/MovieListItem";
import { MediaItem } from "@/types";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { useRequestMedia } from "@/hooks/useRequestMedia";

interface MatchesListProps {
  activeCode?: string;
  matches?: MediaItem[];
  openMovie: (id: string, options?: { showLikedBy?: boolean; sessionCode?: string | null }) => void;
}

export function MatchesList({ activeCode, matches, openMovie }: MatchesListProps) {
  const { request, requesting, requested } = useRequestMedia();
  return (
    <div className="mt-4">
      <h3 className="font-bold mb-1 flex items-center justify-between text-muted-foreground uppercase tracking-wider text-xs">
        Matches
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
                <div key={`${movie.Id}-${activeCode}`} className="relative">
                  <MovieListItem
                    movie={{ ...movie, isMatch: true, sessionCode: activeCode } as any}
                    onClick={() => openMovie(movie.Id, { sessionCode: activeCode })}
                    variant="condensed"
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors disabled:opacity-50"
                    onClick={(e) => { e.stopPropagation(); request(movie.Id, movie.Name); }}
                    disabled={requested.has(movie.Id) || requesting === movie.Id}
                    title={requested.has(movie.Id) ? "Requested" : "Request via Seerr"}
                  >
                    {requested.has(movie.Id)
                      ? <Check className="w-4 h-4 text-green-500" />
                      : <Download className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}
