"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBackgroundStore } from "@/lib/background-store";
import { useBlurData } from "@/hooks/use-blur-data";

export function DynamicBackground({ show = true }: { show?: boolean }) {
  const { backgroundItem } = useBackgroundStore();
  
  const itemId = backgroundItem?.id;
  const initialBlurDataURL = backgroundItem?.blurDataURL;

  const activeBlurURL = useBlurData(itemId, initialBlurDataURL);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background transition-colors duration-1000">
      <AnimatePresence>
        {show && activeBlurURL && (
          <motion.div
            key={itemId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 transform-gpu will-change-opacity"
          >
             <div 
               className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl saturate-[1.8] opacity-60 transform-gpu"
               style={{ backgroundImage: `url(${activeBlurURL})` }}
             />
             <div className="absolute inset-0 bg-linear-to-b from-background/20 via-background/40 to-background/80" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
