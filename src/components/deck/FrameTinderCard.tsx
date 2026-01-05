"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
} from "framer-motion";

export type Direction = "left" | "right" | "up" | "down";

export interface TinderCardHandle {
  swipe: (dir: Direction) => Promise<void>;
  restore: (dir: Direction) => Promise<void>;
}

interface TinderCardProps {
  children: React.ReactNode;
  onSwipe?: (direction: Direction) => void;
  onCardLeftScreen?: (direction: Direction) => void;
  preventSwipe?: Direction[];
  swipeThreshold?: number;
  flickOnSwipe?: boolean;
  className?: string;
}

export const FramerTinderCard = forwardRef<TinderCardHandle, TinderCardProps>(
  (
    {
      children,
      onSwipe,
      onCardLeftScreen,
      preventSwipe = [],
      swipeThreshold = 100,
      flickOnSwipe = true,
      className,
    },
    ref
  ) => {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    // Track if we are in the middle of a programmatic animation
    const isAnimating = useRef(false);

    // --- TRANSFORMS ---
    // Rotation: Tilt based on X axis movement.
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    
    // Opacity: Fade out slowly as it leaves the screen
    const opacity = useTransform(x, [-200, -170, 0, 170, 200], [0, 1, 1, 1, 0]);

    // --- OVERLAYS ---
    // Only show "Like" or "Nope" if moving mostly Horizontally
    const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);
    const likeOpacity = useTransform(x, [20, 100], [0, 1]);

    useImperativeHandle(ref, () => ({
      async swipe(dir: Direction) {
        if (isAnimating.current) return;
        isAnimating.current = true;
        await swipeProgrammatically(dir);
        isAnimating.current = false;
      },
      async restore(dir: Direction) {
        if (isAnimating.current) return;
        isAnimating.current = true;

        const flyDist = 300;
        let startX = 0;
        let startRotate = 0;

        if (dir === "left") {
          startX = -flyDist;
          startRotate = -20;
        } else if (dir === "right") {
          startX = flyDist;
          startRotate = 20;
        }

        // Use controls.set to ensure internal state is synced
        controls.set({ x: startX, y: 0, rotate: startRotate, opacity: 0 });

        // Wait for next frame
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Animate back to center
        await controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          opacity: 1,
          transition: {
            duration: 0.5,
            ease: "easeOut"
          },
        });

        isAnimating.current = false;
      },
    }));

    const swipeProgrammatically = async (dir: Direction) => {
      onSwipe?.(dir);
      
      // Fly out distance
      const flyDist = 250;
      
      let targetX = 0;
      let targetY = 0;
      let targetRotate = 0;

      // Logic for button press
      switch (dir) {
        case "left":
          targetX = -flyDist;
          targetRotate = -20;
          break;
        case "right":
          targetX = flyDist;
          targetRotate = 20;
          break;
        case "up": // Should not happen based on requirements, but handled
          targetY = -flyDist;
          break;
        case "down":
          targetY = flyDist;
          break;
      }

      // SLOWER ANIMATION (0.6s) with a custom ease curve for a "Heavy" feel
      await controls.start({
        x: targetX,
        y: targetY,
        rotate: targetRotate,
        transition: { 
            duration: 0.6, 
            ease: [0.2, 0.8, 0.2, 1] // Cubic bezier
        },
      });

      onCardLeftScreen?.(dir);
    };

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
      const offsetX = info.offset.x;
      const offsetY = info.offset.y;
      const velocityX = info.velocity.x;
      const velocityY = info.velocity.y;

      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);

      let direction: Direction | null = null;
      
      // Determine dominate axis
      // We only allow swipes if X is the dominant movement (Left/Right)
      // Since you only want Swipe Left/Right, we ignore vertical dominance for swipes.
      if (absX > absY) {
         const dirX = offsetX < 0 ? "left" : "right";
         
         // 1. Distance Check
         if (absX > swipeThreshold && !preventSwipe.includes(dirX)) {
             direction = dirX;
         }
         
         // 2. Flick Check
         else if (flickOnSwipe && Math.abs(velocityX) > 500 && !preventSwipe.includes(dirX)) {
             direction = dirX;
         }
      }

      if (direction) {
        // --- THE "THROW" ANIMATION ---
        isAnimating.current = true;
        onSwipe?.(direction);

        // Calculate a target far off screen based on direction
        const flyVal = 300;
        let targetX = direction === "left" ? -flyVal : flyVal;
        
        // Calculate Y based on trajectory to make it look like a physics throw
        // We add the velocity to the current Y
        let targetY = y.get() + (velocityY * 2); 

        await controls.start({
          x: targetX,
          y: targetY,
          opacity: 0, // Ensure it fades out at the very end
          transition: { duration: 0.25, ease: "easeOut" }
        });
        
        onCardLeftScreen?.(direction);
        isAnimating.current = false;
      } else {
        // --- SNAP BACK ---
        // If dragged Up/Down or not far enough, snap back to center
        controls.start({
          x: 0,
          y: 0,
          rotate: 0,
          transition: { type: "spring", stiffness: 300, damping: 25 },
        });
      }
    };

    return (
      <motion.div
        className={className}
        style={{ x, y, rotate, opacity }}
        animate={controls}
        // Enable drag on X and Y
        drag={true} 
        // Zero constraints creates the "Rubber band" effect around the center
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} 
        // Higher elastic = more "floating" feel (0 to 1)
        dragElastic={0.7} 
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
      >
        {children}

        {/* --- LIKE STAMP --- */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-8 left-8 z-10 pointer-events-none"
        >
           <div className="border-4 border-green-500 rounded-lg p-2 px-4 -rotate-12 bg-black/20 backdrop-blur-sm">
            <span className="text-4xl font-black text-green-500 tracking-widest uppercase shadow-black drop-shadow-sm">
              Like
            </span>
          </div>
        </motion.div>

        {/* --- NOPE STAMP --- */}
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute top-8 right-8 z-10 pointer-events-none"
        >
          <div className="border-4 border-red-500 rounded-lg p-2 px-4 rotate-12 bg-black/20 backdrop-blur-sm">
             <span className="text-4xl font-black text-red-500 tracking-widest uppercase shadow-black drop-shadow-sm">
              Nope
            </span>
          </div>
        </motion.div>

      </motion.div>
    );
  }
);