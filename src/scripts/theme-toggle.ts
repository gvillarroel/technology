const THEME_STORAGE_KEY = "efx-site-theme";

type Theme = "light" | "dark";

function getStoredThemePreference() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getActiveTheme(): Theme {
  const rootTheme = document.documentElement.dataset.theme;
  return rootTheme === "dark" ? "dark" : "light";
}

function dispatchThemeChange(theme: Theme) {
  document.dispatchEvent(new CustomEvent("site-theme-change", { detail: { theme } }));
}

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    if (persist) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // Ignore storage failures and keep the in-memory theme state.
  }

  dispatchThemeChange(theme);
}

function updateToggleButton(button: HTMLButtonElement, theme: Theme) {
  const icon = button.querySelector("[data-theme-toggle-icon]");
  const label = button.querySelector("[data-theme-toggle-label]");
  const nextThemeLabel = theme === "dark" ? "Light mode" : "Dark mode";
  const iconName = theme === "dark" ? "light_mode" : "dark_mode";

  button.setAttribute("aria-label", `Switch to ${nextThemeLabel.toLowerCase()}`);
  button.setAttribute("title", `Switch to ${nextThemeLabel.toLowerCase()}`);
  button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");

  if (icon instanceof HTMLElement) {
    icon.textContent = iconName;
  }

  if (label instanceof HTMLElement) {
    label.textContent = nextThemeLabel;
  }
}

export function initThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  updateToggleButton(button, getActiveTheme());

  button.addEventListener("click", () => {
    const nextTheme = getActiveTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
    updateToggleButton(button, nextTheme);
  });

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = () => {
    if (getStoredThemePreference() !== null) {
      return;
    }

    const systemTheme = getSystemTheme();
    applyTheme(systemTheme, false);
    updateToggleButton(button, systemTheme);
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    mediaQuery.addListener(handleSystemThemeChange);
  }
}
