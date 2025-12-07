"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

interface SynchronizedScrollContextType {
  scrollLeft: number;
  setScrollLeft: (value: number) => void;
}

const SynchronizedScrollContext = createContext<
  SynchronizedScrollContextType | undefined
>(undefined);

export const SynchronizedScrollProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [scrollLeft, setScrollLeft] = useState(0);

  return (
    <SynchronizedScrollContext.Provider
      value={{
        scrollLeft,
        setScrollLeft,
      }}
    >
      {children}
    </SynchronizedScrollContext.Provider>
  );
};

interface UseSynchronizedScrollOptions {
  isMaster?: boolean; // Designates if this element is the source of scroll events
}

export const useSynchronizedScroll = (options?: UseSynchronizedScrollOptions) => {
  const context = useContext(SynchronizedScrollContext);
  if (context === undefined) {
    throw new Error(
      "useSynchronizedScroll must be used within a SynchronizedScrollProvider"
    );
  }

  const { scrollLeft, setScrollLeft } = context;
  const localRef = useRef<HTMLDivElement>(null);
  // This flag prevents programmatic scrolls from triggering handleScroll and causing loops
  const isProgrammaticScroll = useRef(false);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    if (options?.isMaster && !isProgrammaticScroll.current) {
      // Only the master updates the shared state
      setScrollLeft(event.currentTarget.scrollLeft);
    }
  }, [options?.isMaster, setScrollLeft]);

  useEffect(() => {
    // All elements (master and followers) need to update their scroll position
    // based on the shared scrollLeft.
    if (localRef.current && localRef.current.scrollLeft !== scrollLeft) {
      isProgrammaticScroll.current = true; // Set flag before programmatic scroll
      localRef.current.scrollLeft = scrollLeft;
      // Reset flag after a short delay to allow browser to process scroll
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [scrollLeft]); // Only re-run when shared scrollLeft changes

  return { ref: localRef, onScroll: handleScroll, scrollLeftValue: scrollLeft };
};