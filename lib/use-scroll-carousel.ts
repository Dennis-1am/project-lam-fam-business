import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollCarousel(length: number, initialIndex = 0) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(initialIndex);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || length <= 1) return;

    const update = () => {
      if (el.clientWidth === 0) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActive(Math.min(length - 1, Math.max(0, index)));
    };

    if (initialIndex > 0) {
      el.scrollLeft = initialIndex * el.clientWidth;
    }
    update();

    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [length, initialIndex]);

  const scrollTo = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, []);

  return { containerRef, active, scrollTo };
}