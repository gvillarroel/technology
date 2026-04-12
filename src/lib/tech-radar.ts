import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { getScopedHtmlPageUrl, getScopedMarkdownPageUrl } from "./dual-format";
import { withBasePath } from "./site-url";
import { createMarkdownDocument, markdownLink } from "./markdown";

export interface RadarEntry {
  slug: string;
  name: string;
  ring: "Adopt" | "Explore" | "To evaluate" | "Endure" | "Retired";
  primaryScope: string;
  archetypes: RadarArchetype[];
  sourceType: "oss" | "non-oss" | "internal";
  status: string;
  domain: string;
  owner: string;
  summary: string;
  reasoning: string;
  maturity: string;
  operationScope: string;
  operationModel: string;
  reviewCadence: string;
  updated: string;
  capabilities: string[];
  guardrails: string[];
  signals: string[];
  actions: string[];
  alternatives: string[];
}

export type RadarArchetype = "Infrastructure" | "Tool" | "Product";
export type RadarSourceType = RadarEntry["sourceType"];

export interface RadarRingDefinition {
  name: RadarEntry["ring"];
  order: number;
  radius: number;
  color: string;
  accent: string;
  description: string;
}

export interface RadarBlipPoint {
  x: number;
  y: number;
  angle: number;
  radius: number;
}

export interface RadarBlipLayout extends RadarBlipPoint {
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
}

export interface RadarQuadrant {
  name: string;
  start: number;
  end: number;
}

export function getRadarRingToken(ring: RadarEntry["ring"]) {
  return ring.toLowerCase().replace(/\s+/g, "-");
}

export const defaultVisibleRings: RadarEntry["ring"][] = ["Adopt", "Explore", "Endure"];
export const radarArchetypes: RadarArchetype[] = ["Infrastructure", "Tool", "Product"];
export const radarSourceTypes: RadarSourceType[] = ["oss", "non-oss", "internal"];

const radarYamlPath = join(process.cwd(), "data", "tech-radar.yaml");

export const radarRings: RadarRingDefinition[] = [
  {
    name: "Adopt",
    order: 0,
    radius: 0.18,
    color: "var(--primary-green)",
    accent: "#b9f0a7",
    description: "Default choice for new implementations.",
  },
  {
    name: "Explore",
    order: 1,
    radius: 0.34,
    color: "var(--primary-blue)",
    accent: "#b8ebfb",
    description: "Investigate in bounded use cases before scaling.",
  },
  {
    name: "To evaluate",
    order: 3,
    radius: 0.68,
    color: "var(--primary-yellow)",
    accent: "#ffe698",
    description: "Known candidate with no formal recommendation yet.",
  },
  {
    name: "Endure",
    order: 2,
    radius: 0.5,
    color: "var(--primary-orange)",
    accent: "#ffd5ae",
    description: "Keep running with restraint while planning the next move.",
  },
  {
    name: "Retired",
    order: 4,
    radius: 0.86,
    color: "var(--brand-red)",
    accent: "#ffc2ce",
    description: "Do not use for new work and remove where practical.",
  },
];

export const radarQuadrants: RadarQuadrant[] = [
  { name: "Frontend", start: -180, end: -90 },
  { name: "Data and AI", start: -90, end: 0 },
  { name: "Platform", start: 0, end: 90 },
  { name: "Delivery", start: 90, end: 180 },
];

function toList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toScalar(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "");
}

function toSourceType(value: unknown): RadarEntry["sourceType"] {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "internal") {
    return "internal";
  }

  if (normalized === "non-oss") {
    return "non-oss";
  }

  return "oss";
}

function toArchetypes(value: unknown): RadarArchetype[] {
  const allowed = new Set<RadarArchetype>(radarArchetypes);
  return toList(value).filter((item): item is RadarArchetype => allowed.has(item as RadarArchetype));
}

export async function getRadarEntries(): Promise<RadarEntry[]> {
  const rawFile = await readFile(radarYamlPath, "utf-8");
  const document = parse(rawFile) as { entries?: Array<Record<string, unknown>> };
  const entries = document.entries ?? [];

  return entries
    .map((entry) => ({
      slug: toScalar(entry.slug),
      name: toScalar(entry.name),
      ring: entry.ring as RadarEntry["ring"],
      primaryScope: toScalar(entry.primary_scope),
      archetypes: toArchetypes(entry.archetypes),
      sourceType: toSourceType(entry.source_type),
      status: toScalar(entry.status),
      domain: toScalar(entry.domain),
      owner: toScalar(entry.owner),
      summary: toScalar(entry.summary),
      reasoning: toScalar(entry.reasoning),
      maturity: toScalar(entry.maturity),
      operationScope: toScalar(entry.operation_scope),
      operationModel: toScalar(entry.operation_model),
      reviewCadence: toScalar(entry.review_cadence),
      updated: toScalar(entry.updated),
      capabilities: toList(entry.capabilities),
      guardrails: toList(entry.guardrails),
      signals: toList(entry.signals),
      actions: toList(entry.actions),
      alternatives: toList(entry.alternatives),
    }))
    .sort((left, right) => {
      const ringOrder =
        getRingDefinition(left.ring).order - getRingDefinition(right.ring).order;

      if (ringOrder !== 0) {
        return ringOrder;
      }

      const scopeOrder = left.primaryScope.localeCompare(right.primaryScope);

      if (scopeOrder !== 0) {
        return scopeOrder;
      }

      return left.name.localeCompare(right.name);
    });
}

export async function getRadarEntryBySlug(slug: string) {
  const entries = await getRadarEntries();
  return entries.find((entry) => entry.slug === slug);
}

export async function getRadarSourceTypes() {
  const entries = await getRadarEntries();
  return radarSourceTypes.filter((sourceType) => entries.some((entry) => entry.sourceType === sourceType));
}

export function getRingDefinition(ring: RadarEntry["ring"]) {
  return radarRings.find((item) => item.name === ring) ?? radarRings[0];
}

function hashValue(value: string) {
  return [...value].reduce((total, character, index) => {
    return total + character.charCodeAt(0) * (index + 17);
  }, 0);
}

function getQuadrantAngles(primaryScope: string) {
  return (
    radarQuadrants.find((quadrant) => quadrant.name === primaryScope) ??
    radarQuadrants[radarQuadrants.length - 1]
  );
}

function getRingBand(ring: RadarEntry["ring"]) {
  const current = getRingDefinition(ring);
  const previous = radarRings[current.order - 1];
  const next = radarRings[current.order + 1];

  return {
    min: previous ? (previous.radius + current.radius) / 2 : 0.1,
    max: next ? (current.radius + next.radius) / 2 : 0.94,
  };
}

function toLayoutPoint(angle: number, radius: number): RadarBlipLayout {
  const angleInRadians = (angle * Math.PI) / 180;
  const x = Number((Math.cos(angleInRadians) * radius).toFixed(4));
  const y = Number((Math.sin(angleInRadians) * radius).toFixed(4));
  const magnitude = Math.max(Math.hypot(x, y), 0.001);
  const outwardX = x / magnitude;
  const outwardY = y / magnitude;
  const labelDistance = 7.5;

  return {
    x,
    y,
    angle: Number(angle.toFixed(2)),
    radius: Number(radius.toFixed(4)),
    labelX: Number((x * 100 + outwardX * labelDistance).toFixed(2)),
    labelY: Number((y * 100 + outwardY * labelDistance).toFixed(2)),
    labelAnchor: outwardX >= 0 ? "start" : "end",
  };
}

export function getRadarBlipLayouts(entries: RadarEntry[]) {
  const layouts = new Map<string, RadarBlipLayout>();
  const groupedEntries = new Map<string, RadarEntry[]>();

  for (const entry of entries) {
    const key = `${entry.ring}::${entry.primaryScope}`;
    const group = groupedEntries.get(key) ?? [];
    group.push(entry);
    groupedEntries.set(key, group);
  }

  for (const [groupKey, groupEntries] of groupedEntries) {
    const [ringName, primaryScope] = groupKey.split("::") as [RadarEntry["ring"], string];
    const quadrant = getQuadrantAngles(primaryScope);
    const ringBand = getRingBand(ringName);
    const anglePadding = 8;
    const usableStart = quadrant.start + anglePadding;
    const usableEnd = quadrant.end - anglePadding;
    const usableRange = usableEnd - usableStart;
    const laneCount = Math.min(4, Math.max(1, Math.ceil(groupEntries.length / 5)));
    const angleSlotCount = Math.max(1, Math.ceil(groupEntries.length / laneCount));
    const radiusStep = laneCount === 1 ? 0 : (ringBand.max - ringBand.min) / (laneCount + 1);
    const orderedEntries = [...groupEntries].sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name);
      if (nameOrder !== 0) {
        return nameOrder;
      }

      return hashValue(left.slug) - hashValue(right.slug);
    });

    orderedEntries.forEach((entry, index) => {
      const angleIndex = Math.floor(index / laneCount);
      const laneIndex = index % laneCount;
      const angleBase = usableStart + ((angleIndex + 1) / (angleSlotCount + 1)) * usableRange;
      const laneWobble = laneCount === 1 ? 0 : ((laneIndex / (laneCount - 1)) - 0.5) * 3.2;
      const angle = angleBase + laneWobble;
      const radius =
        laneCount === 1
          ? (ringBand.min + ringBand.max) / 2
          : ringBand.min + radiusStep * (laneIndex + 1);

      layouts.set(entry.slug, toLayoutPoint(angle, radius));
    });
  }

  return layouts;
}

export function getRadarIndexMarkdown(entries: RadarEntry[]) {
  const doc = createMarkdownDocument({
    title: "Tech Radar",
    description: "The technology radar for approved and emerging technologies at e*f(x).",
    canonicalHtml: withBasePath("/tech-radar/"),
  });

  doc.heading("Tech Radar");
  doc.paragraph("Operational catalog for evaluated, exploratory, retired, and not yet evaluated technologies.");
  doc.section("Index");

  for (const entry of entries) {
    doc.bullet(markdownLink(entry.name, getScopedMarkdownPageUrl("/tech-radar", entry.slug)));
    doc.keyValueList([
      { label: "Ring", value: entry.ring },
      { label: "Primary scope", value: entry.primaryScope },
      { label: "Archetypes", value: entry.archetypes.join(", ") },
      { label: "Source type", value: entry.sourceType },
      { label: "Status", value: entry.status },
      { label: "Domain", value: entry.domain },
      { label: "Summary", value: entry.summary },
    ], 1);
    if (entry.alternatives.length > 0) {
      doc.bullet(`Alternatives: ${entry.alternatives.join(", ")}`, 1);
      doc.blank();
    }
  }

  doc.paragraph(markdownLink("Back to home", withBasePath("/index.md")));

  return doc.finish();
}

export function getRadarEntryMarkdown(entry: RadarEntry) {
  const doc = createMarkdownDocument({
    title: entry.name,
    description: entry.summary,
    canonicalHtml: getScopedHtmlPageUrl("/tech-radar", entry.slug),
  });

  doc.heading(entry.name);
  doc.paragraph(entry.summary);
  doc.section("Classification", () => {
    doc.keyValueList([
      { label: "Ring", value: entry.ring },
      { label: "Primary scope", value: entry.primaryScope },
      { label: "Archetypes", value: entry.archetypes.join(", ") },
      { label: "Source type", value: entry.sourceType },
      { label: "Status", value: entry.status },
      { label: "Domain", value: entry.domain },
      { label: "Owner", value: entry.owner },
      { label: "Updated", value: entry.updated },
    ]);
  });
  doc.section("Decision", () => doc.paragraph(entry.reasoning));
  doc.section("Operation", () => {
    doc.keyValueList([
      { label: "Scope", value: entry.operationScope },
      { label: "Model", value: entry.operationModel },
      { label: "Maturity", value: entry.maturity },
      { label: "Review cadence", value: entry.reviewCadence },
    ]);
  });
  doc.section("Capabilities", () => doc.bullets(entry.capabilities));
  doc.section("Guardrails", () => doc.bullets(entry.guardrails));
  doc.section("Signals", () => doc.bullets(entry.signals));
  doc.section("Actions", () => doc.bullets(entry.actions));

  if (entry.alternatives.length > 0) {
    doc.section("Alternatives", () => doc.bullets(entry.alternatives));
  }

  doc.paragraph(markdownLink("Back to index", withBasePath("/tech-radar.md")));
  return doc.finish({ trailingNewline: false });
}
