type FloatingRailConfig = {
  rail: string;
  anchor: string;
  dock?: string;
  mobileQuery?: string;
  topOffsetRem?: number;
};

export function initFloatingRail({
  rail,
  anchor,
  dock,
  mobileQuery = "(max-width: 960px)",
  topOffsetRem = 0.9,
}: FloatingRailConfig) {
  const railElement = document.querySelector(rail);
  const anchorElement = document.querySelector(anchor);
  const dockElement = dock ? document.querySelector(dock) : null;

  if (!(railElement instanceof HTMLElement) || !(anchorElement instanceof HTMLElement)) {
    return;
  }

  const syncDock = () => {
    const railHeight = `${railElement.offsetHeight}px`;
    anchorElement.style.height = railHeight;

    if (dockElement instanceof HTMLElement) {
      dockElement.style.height = "0px";
    }
  };

  const updatePosition = () => {
    if (window.matchMedia(mobileQuery).matches) {
      if (railElement.parentElement !== anchorElement) {
        anchorElement.append(railElement);
      }

      railElement.classList.remove("is-floating");
      railElement.style.removeProperty("--floating-left");
      railElement.style.removeProperty("--floating-width");
      return;
    }

    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const topOffset = rootFontSize * topOffsetRem;
    const anchorRect = anchorElement.getBoundingClientRect();

    if (anchorRect.top > topOffset) {
      if (railElement.parentElement !== anchorElement) {
        anchorElement.append(railElement);
      }

      railElement.classList.remove("is-floating");
      railElement.style.removeProperty("--floating-left");
      railElement.style.removeProperty("--floating-width");
      return;
    }

    if (railElement.parentElement !== anchorElement) {
      anchorElement.append(railElement);
    }

    railElement.style.setProperty("--floating-left", `${anchorRect.left}px`);
    railElement.style.setProperty("--floating-width", `${anchorElement.offsetWidth}px`);
    railElement.classList.add("is-floating");
  };

  if ("ResizeObserver" in window) {
    const railObserver = new ResizeObserver(() => {
      syncDock();
      updatePosition();
    });

    railObserver.observe(railElement);
  }

  const handleResize = () => {
    syncDock();
    updatePosition();
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", updatePosition, { passive: true });

  syncDock();
  updatePosition();
}
