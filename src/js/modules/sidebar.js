// Usage: https://github.com/Grsmto/simplebar
import SimpleBar from "simplebar";

const storageGet = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    return;
  }
};

const initialize = () => {
  const simplebarInstance = initializeSimplebar();
  initializeSidebarCollapse();
  restoreSidebarScroll(simplebarInstance);
  initializePageTransition();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove("sidebar-hold");
    });
  });
}

const initializeSimplebar = () => {
  const simplebarElement = document.getElementsByClassName("js-simplebar")[0];

  if(simplebarElement){
    const simplebarInstance = new SimpleBar(document.getElementsByClassName("js-simplebar")[0]);
    simplebarInstance.getScrollElement().addEventListener("scroll", () => {
      storageSet("airnotix-sidebar-scroll", String(simplebarInstance.getScrollElement().scrollTop));
    }, { passive: true });

    /* Recalculate simplebar on sidebar dropdown toggle */
    const sidebarDropdowns = document.querySelectorAll(".js-sidebar [data-bs-parent]");
    
    sidebarDropdowns.forEach(link => {
      link.addEventListener("shown.bs.collapse", () => {
        simplebarInstance.recalculate();
      });
      link.addEventListener("hidden.bs.collapse", () => {
        simplebarInstance.recalculate();
      });
    });

    return simplebarInstance;
  }

  return null;
}

const initializeSidebarCollapse = () => {
  const sidebarElement = document.getElementsByClassName("js-sidebar")[0];
  const sidebarToggleElement = document.getElementsByClassName("js-sidebar-toggle")[0];

  if(sidebarElement && sidebarToggleElement) {
    const sidebarIsOpen = () => {
      const narrow = window.matchMedia("(max-width: 991.98px)").matches;
      const collapsed = sidebarElement.classList.contains("collapsed");
      return narrow ? collapsed : !collapsed;
    };

    const syncSidebarToggle = () => {
      const open = sidebarIsOpen();
      sidebarToggleElement.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const setCollapsed = (collapsed) => {
      sidebarElement.classList.toggle("collapsed", collapsed);
      document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
      storageSet("airnotix-sidebar-collapsed", collapsed ? "1" : "0");
      syncSidebarToggle();
    };

    setCollapsed(storageGet("airnotix-sidebar-collapsed") === "1");
    window.addEventListener("resize", syncSidebarToggle);

    sidebarToggleElement.addEventListener("click", () => {
      setCollapsed(!sidebarElement.classList.contains("collapsed"));

      sidebarElement.addEventListener("transitionend", () => {
        window.dispatchEvent(new Event("resize"));
      }, { once: true });
    });
  }
}

const restoreSidebarScroll = (simplebarInstance) => {
  if (!simplebarInstance) {
    return;
  }

  const scrollElement = simplebarInstance.getScrollElement();
  const saved = Number(storageGet("airnotix-sidebar-scroll") || 0);
  if (!saved) {
    return;
  }

  const apply = () => {
    if (scrollElement.scrollTop !== saved) {
      scrollElement.scrollTop = saved;
    }
  };

  apply();
  window.requestAnimationFrame(apply);
};

const initializePageTransition = () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".sidebar a.sidebar-link, a.sidebar-brand").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") {
        return;
      }
      const scrollElement = document.querySelector(".simplebar-content-wrapper");
      if (scrollElement) {
        storageSet("airnotix-sidebar-scroll", String(scrollElement.scrollTop));
      }
      if (reduced) {
        return;
      }
      const content = document.querySelector(".content");
      if (!content || content.classList.contains("page-leave")) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      content.classList.add("page-leave");
      window.setTimeout(() => {
        window.location.href = href;
      }, 160);
    });
  });
}

// Wait until page is loaded
document.addEventListener("DOMContentLoaded", () => initialize());