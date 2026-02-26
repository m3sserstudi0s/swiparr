"use client";
import { motion, AnimatePresence } from "framer-motion";
import { MediaItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/hooks/api";

interface MatchOverlayProps {
  item: MediaItem | null;
  sessionCode?: string | null;
  onClose: () => void;
}

export function MatchOverlay({ item, sessionCode, onClose }: MatchOverlayProps) {
  const { openMovie } = useMovieDetail();
  const { data: session } = useSession();
  const likedBy = item?.likedBy ?? [];
  const otherUsers = session?.userId
    ? likedBy.filter((user) => user.userId !== session.userId)
    : likedBy.slice(1);
  const otherLabel = otherUsers.length > 1
    ? `${otherUsers.length} others`
    : (otherUsers[0]?.userName || "someone");

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogTitle/>
      <DialogContent 
        className="bg-transparent border-none shadow-none p-0 max-w-none w-auto outline-none h-svh md:h-auto"
        overlayClassName="bg-black/30 backdrop-blur-md"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key="match-content"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative flex flex-col items-center text-center max-w-sm w-full outline-none mt-10"
            >
              {/* Animated Heart Background */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1.2, 1.4, 1.2] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-10 opacity-40 pointer-events-none"
              >
                <Heart className="w-75 h-75 fill-neutral-900 text-neutral-900" />
              </motion.div>

              <h1 className="text-5xl font-black italic text-neutral-100 mb-2 drop-shadow-2xl tracking-tighter uppercase">
                It's a match!
              </h1>
              <p className="text-neutral-200 md:text-md text-lg mb-6 px-4 z-1">
                You and {otherLabel} want to watch <span className="text-neutral-200 font-bold">{item.Name}</span>
              </p>

              {item.likedBy && item.likedBy.length > 0 && (
                <UserAvatarList users={item.likedBy} size="lg" className="mb-10" />
              )}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative md:w-64 md:h-96 mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => { openMovie(item.Id, { sessionCode }); onClose(); }}
              >
                <OptimizedImage
                  src={item.ImageTags?.Primary 
                    ? `/api/media/image/${item.Id}?tag=${item.ImageTags?.Primary}`
                    : `/api/media/image/${item.Id}`
                  }
                  alt={item.Name}
                  externalId={item.Id}
                  blurDataURL={item.BlurDataURL}
                  className="w-full h-full object-cover"
                  height={700}
                  width={500}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 w-full items-center"
              >
                <Button
                  size="lg"
                  variant={'secondary'}
                  className="rounded-full text-lg h-12 w-48 font-bold shadow-lg"
                  onClick={onClose}
                >
                  Continue
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
