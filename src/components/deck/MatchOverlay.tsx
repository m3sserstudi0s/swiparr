"use client";
import { motion, AnimatePresence } from "framer-motion";
import { JellyfinItem } from "@/types/swiparr";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { UserAvatarList } from "../session/UserAvatarList";
import { useMovieDetail } from "../movie/MovieDetailProvider";

interface MatchOverlayProps {
  item: JellyfinItem | null;
  onClose: () => void;
}

export function MatchOverlay({ item, onClose }: MatchOverlayProps) {
  const { openMovie } = useMovieDetail();

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative flex flex-col items-center text-center max-w-sm w-full"
          >
            {/* Animated Heart Background */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-20 opacity-10 pointer-events-none"
            >
              <Heart className="w-80 h-80 fill-primary text-primary" />
            </motion.div>

            <h1 className="text-5xl font-black italic text-primary mb-2 drop-shadow-2xl tracking-tighter uppercase">
              It's a match!
            </h1>
            <p className="text-muted-foreground text-lg mb-8 px-4">
              You both want to watch <span className="text-foreground font-bold">{item.Name}</span>
            </p>

            {item.likedBy && item.likedBy.length > 0 && (
              <UserAvatarList users={item.likedBy} size="lg" className="mb-8" />
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-64 h-96 mb-10 rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/20"
              onClick={() => { openMovie(item.Id); onClose(); }}
            >
              <OptimizedImage
                src={`/api/jellyfin/image/${item.Id}`}
                alt={item.Name}
                jellyfinItemId={item.Id}
                blurDataURL={item.BlurDataURL}
                className="w-full h-full object-cover"
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
                className="rounded-full text-lg h-12 w-40 font-bold shadow-lg shadow-primary/20"
                onClick={onClose}
              >
                Continue
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
