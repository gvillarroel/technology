const COPY_RESET_DELAY_MS = 1800;

function isCopyablePre(pre: HTMLPreElement) {
  if (pre.classList.contains("bat-mermaid-diagram") || pre.classList.contains("mermaid")) {
    return false;
  }

  if (pre.classList.contains("terminal-bat-line")) {
    return false;
  }

  return (
    pre.closest(".docs-markdown") !== null ||
    pre.classList.contains("skills-install-code") ||
    pre.classList.contains("docs-index-config-preview") ||
    pre.classList.contains("adrs-yaml-preview") ||
    pre.querySelector("code") !== null
  );
}

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function getCopyText(pre: HTMLPreElement) {
  const code = pre.querySelector("code");
  const rawText = code?.textContent ?? pre.textContent ?? "";
  return rawText.replace(/\u00a0/g, " ");
}

function setButtonState(button: HTMLButtonElement, copied: boolean) {
  const icon = button.querySelector(".code-copy-button-icon");

  button.classList.toggle("is-copied", copied);
  button.setAttribute("aria-label", copied ? "Copied" : "Copy code");
  button.setAttribute("title", copied ? "Copied" : "Copy code");

  if (icon) {
    icon.textContent = copied ? "check" : "content_copy";
  }
}

export function initCodeCopyButtons() {
  const blocks = Array.from(document.querySelectorAll("pre"));

  for (const preElement of blocks) {
    if (!(preElement instanceof HTMLPreElement) || preElement.dataset.copyReady === "true") {
      continue;
    }

    if (!isCopyablePre(preElement)) {
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "code-copy-shell";
    preElement.before(wrapper);
    wrapper.append(preElement);

    preElement.dataset.copyReady = "true";
    preElement.classList.add("code-copy-target");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-button";
    button.setAttribute("aria-label", "Copy code");
    button.setAttribute("title", "Copy code");
    button.innerHTML =
      '<span class="material-symbols-rounded code-copy-button-icon" aria-hidden="true">content_copy</span>';

    let resetTimer: number | undefined;

    button.addEventListener("click", async () => {
      try {
        await writeToClipboard(getCopyText(preElement));
        window.clearTimeout(resetTimer);
        setButtonState(button, true);
        resetTimer = window.setTimeout(() => {
          setButtonState(button, false);
        }, COPY_RESET_DELAY_MS);
      } catch {
        setButtonState(button, false);
      }
    });

    wrapper.append(button);
  }
}
