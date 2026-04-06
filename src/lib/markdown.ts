export interface MarkdownDocumentOptions {
  title: string;
  description: string;
  canonicalHtml: string;
}

export interface MarkdownKeyValue {
  label: string;
  value: string;
}

function escapeFrontmatterValue(value: string) {
  return value.replace(/\r?\n/g, " ").trim();
}

export class MarkdownDocument {
  private readonly lines: string[] = [];

  constructor(options: MarkdownDocumentOptions) {
    this.lines.push("---");
    this.lines.push(`title: ${escapeFrontmatterValue(options.title)}`);
    this.lines.push(`description: ${escapeFrontmatterValue(options.description)}`);
    this.lines.push(`canonical_html: ${options.canonicalHtml}`);
    this.lines.push("---");
    this.blank();
  }

  blank() {
    if (this.lines.at(-1) !== "") {
      this.lines.push("");
    }
  }

  heading(text: string, level = 1) {
    this.lines.push(`${"#".repeat(level)} ${text}`);
    this.blank();
  }

  paragraph(text: string) {
    if (!text.trim()) {
      return;
    }

    this.lines.push(text);
    this.blank();
  }

  bullet(text: string, indent = 0) {
    this.lines.push(`${"  ".repeat(indent)}- ${text}`);
  }

  bullets(items: string[], indent = 0) {
    for (const item of items) {
      this.bullet(item, indent);
    }

    this.blank();
  }

  keyValueList(entries: MarkdownKeyValue[], indent = 0) {
    for (const entry of entries) {
      this.bullet(`${entry.label}: ${entry.value}`, indent);
    }

    this.blank();
  }

  section(title: string, build?: () => void) {
    this.heading(title, 2);

    if (build) {
      build();
    }
  }

  subheading(title: string, level = 3) {
    this.heading(title, level);
  }

  codeBlock(code: string, language = "") {
    this.lines.push(`\`\`\`${language}`.trimEnd());
    this.lines.push(code);
    this.lines.push("```");
    this.blank();
  }

  raw(text: string) {
    if (!text.trim()) {
      return;
    }

    for (const line of text.split(/\r?\n/)) {
      this.lines.push(line);
    }

    this.blank();
  }

  finish({ trailingNewline = true }: { trailingNewline?: boolean } = {}) {
    const content = this.lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
    return trailingNewline ? `${content}\n` : content;
  }
}

export function createMarkdownDocument(options: MarkdownDocumentOptions) {
  return new MarkdownDocument(options);
}

export function markdownLink(label: string, href: string) {
  return `[${label}](${href})`;
}

export function markdownResponse(markdown: string) {
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
