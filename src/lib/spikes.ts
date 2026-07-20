import { getDataset } from "./site-catalog";
import { withBasePath } from "./site-url";

export type SpikePageKey =
  | "format-architecture"
  | "terminal-colors"
  | "dual-format"
  | "json-format"
  | "csv-format"
  | "github-format";

export interface SpikeIntroPill {
  label: string;
  value: string;
}

export interface SpikePageContent {
  label: string;
  href: string;
  eyebrow: string;
  title: string;
  summary: string;
  pills: SpikeIntroPill[];
}

const spikePageOrder: SpikePageKey[] = [
  "format-architecture",
  "terminal-colors",
  "dual-format",
  "json-format",
  "csv-format",
  "github-format",
];

function toScalar(value: unknown) {
  return String(value ?? "").trim();
}

async function readSpikesDocument() {
  return getDataset<{
    pages?: Record<string, Record<string, unknown>>;
  }>("spikes");
}

function normalizePills(value: unknown): SpikeIntroPill[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      label: toScalar((item as Record<string, unknown>)?.label),
      value: toScalar((item as Record<string, unknown>)?.value),
    }))
    .filter((item) => item.label && item.value);
}

export async function getSpikePageContent(pageKey: SpikePageKey): Promise<SpikePageContent> {
  const document = await readSpikesDocument();
  const entry = document.pages?.[pageKey];

  if (!entry) {
    throw new Error(`Missing spike page content for "${pageKey}".`);
  }

  return {
    label: toScalar(entry.label),
    href: withBasePath(toScalar(entry.href)),
    eyebrow: toScalar(entry.eyebrow),
    title: toScalar(entry.title),
    summary: toScalar(entry.summary),
    pills: normalizePills(entry.pills),
  };
}

export async function getSpikeSectionNavItems(currentPage?: SpikePageKey) {
  const document = await readSpikesDocument();

  return spikePageOrder.flatMap((pageKey) => {
    const entry = document.pages?.[pageKey];

    if (!entry) {
      return [];
    }

    return [
      {
        href: withBasePath(toScalar(entry.href)),
        label: toScalar(entry.label),
        current: pageKey === currentPage,
      },
    ];
  });
}
