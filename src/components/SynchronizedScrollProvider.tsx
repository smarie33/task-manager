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
  registerScrollRef: (ref: React.RefObject<HTMLElement>) => void;
  unregisterScrollRef: (ref: React.RefObject<HTMLElement>) => void;
  handleScroll: (event: React.UIEvent<HTMLElement>) => void;
  scrollLeft: number;
}

const SynchronizedScrollContext = createContext<
  SynchronizedScrollContextType | undefined
>(undefined);

export const SynchronizedScrollProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRefs = useRef(new Set<React.RefObject<HTMLElement>>());
  const isProgrammaticScroll = useRef(false);

  const registerScrollRef = useCallback((ref: React.RefObject<HTMLElement>) => {
    scrollRefs.current.add(ref);
    // Immediately sync new refs to current scroll position
    if (ref.current) {
      ref.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  const unregisterScrollRef = useCallback((ref: React.RefObject<HTMLElement>) => {
    scrollRefs.current.delete(ref);
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    if (isProgrammaticScroll.current) {
      return;
    }

    const newScrollLeft = event.currentTarget.scrollLeft;
    if (newScrollLeft === scrollLeft) {
      return; // No actual scroll change
    }

    setScrollLeft(newScrollLeft); // Update the shared state
  }, [scrollLeft]);

  // Effect to apply the shared scrollLeft to all registered refs
  useEffect(() => {
    isProgrammaticScroll.current = true;
    scrollRefs.current.forEach((ref) => {
      if (ref.current && ref.current.scrollLeft !== scrollLeft) {
        ref.current.scrollLeft = scrollLeft;
      }
    });
    isProgrammaticScroll.current = false;
  }, [scrollLeft]);

  return (
    <SynchronizedScrollContext.Provider
      value={{
        registerScrollRef,
        unregisterScrollRef,
        handleScroll,
        scrollLeft,
      }}
    >
      {children}
    </SynchronizedScrollContext.Provider>
  );
};

export const useSynchronizedScroll = () => {
  const context = useContext(SynchronizedScrollContext);
  if (context === undefined) {
    throw new Error(
      "useSynchronizedScroll must be used within a SynchronizedScrollProvider"
    );
  }

  const localRef = useRef<HTMLDivElement>(null);
  const { registerScrollRef, unregisterScrollRef, handleScroll, scrollLeft } = context;

  useEffect(() => {
    registerScrollRef(localRef);
    return () => {
      unregisterScrollRef(localRef);
    };
  }, [registerScrollRef, unregisterScrollRef]);

  // Ensure that if the component mounts, it immediately syncs to the current scroll position
  useEffect(() => {
    if (localRef.current && localRef.current.scrollLeft !== scrollLeft) {
      localRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);


  return { ref: localRef, onScroll: handleScroll };
};