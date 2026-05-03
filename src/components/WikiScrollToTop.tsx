import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const WikiScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith("/wiki")) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

export default WikiScrollToTop;
