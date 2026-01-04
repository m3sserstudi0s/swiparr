"use client";

import React, { createContext, useContext, useState } from "react";
import { MovieDetailView } from "./MovieDetailView";

interface MovieDetailContextType {
  openMovie: (id: string, showLikedBy?: boolean) => void;
  closeMovie: () => void;
}

const MovieDetailContext = createContext<MovieDetailContextType | undefined>(undefined);

export function MovieDetailProvider({ children }: { children: React.ReactNode }) {
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [showLikedBy, setShowLikedBy] = useState<boolean | undefined>();

  const openMovie = (id: string, showLikedBy?: boolean) => { setSelectedMovieId(id); setShowLikedBy(showLikedBy); }
  const closeMovie = () => { setSelectedMovieId(null); setShowLikedBy(undefined); }

  return (
    <MovieDetailContext.Provider value={{ openMovie, closeMovie }}>
      {children}
      <MovieDetailView movieId={selectedMovieId} onClose={closeMovie} showLikedBy={showLikedBy} />
    </MovieDetailContext.Provider>
  );
}

export function useMovieDetail() {
  const context = useContext(MovieDetailContext);
  if (context === undefined) {
    throw new Error("useMovieDetail must be used within a MovieDetailProvider");
  }
  return context;
}
