import type { AiSdlcSkillDetailCopy } from "./ai-sdlc";
import { createMarkdownDocument, markdownLink } from "./markdown";
import type { ApprovedSkill } from "./skills-repositories";

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatSkillPassRatio(value: number) {
  return `${value.toFixed(1)} pass`;
}

export function getSkillDetailMarkdown(skill: ApprovedSkill, copy: AiSdlcSkillDetailCopy) {
  const doc = createMarkdownDocument({
    title: skill.name,
    description: skill.description,
    canonicalHtml: `/ai-sdlc/skills/${skill.repositorySlug}/${skill.slug}/`,
  });

  doc.heading(skill.name);
  doc.paragraph(skill.description);
  doc.section(copy.markdownSummaryHeading, () => {
    doc.keyValueList([
      { label: copy.markdownRepositoryLabel, value: skill.repositoryName },
      { label: copy.markdownEvaluatedLabel, value: skill.evaluationSummary.evaluated ? copy.markdownYesLabel : copy.markdownNoLabel },
      { label: copy.markdownAverageSuccessRatioLabel, value: skill.evaluationSummary.evaluated ? formatPercent(skill.evaluationSummary.averageSuccessRatio) : copy.averageSuccessRatioEmpty },
      { label: copy.markdownEvaluationCountLabel, value: String(skill.evaluationSummary.evaluationCount) },
      { label: copy.markdownInstallPathLabel, value: skill.installPath },
    ]);
  });

  if (skill.installAvailable) {
    doc.section(copy.markdownInstallHeading, () => {
      doc.codeBlock(skill.installSnippet, "bash");
    });
  }

  if (skill.tags.length > 0 || skill.metadataPairs.length > 0) {
    doc.section(copy.markdownMetadataHeading, () => {
      for (const tag of skill.tags) {
        doc.bullet(`${copy.markdownTagPrefix}: ${tag}`);
      }
      for (const item of skill.metadataPairs) {
        doc.bullet(`${item.key}: ${item.value}`);
      }
      doc.blank();
    });
  }

  if (skill.evaluations.length > 0) {
    doc.section(copy.markdownEvaluationsHeading);
    for (const evaluation of skill.evaluations) {
      doc.subheading(evaluation.benchmark.id, 3);
      doc.keyValueList([
        { label: copy.markdownDescriptionLabel, value: evaluation.benchmark.description },
        { label: copy.markdownSuccessRatioLabel, value: formatPercent(evaluation.results.averageSuccessRatio) },
        { label: copy.markdownRunsLabel, value: `${evaluation.results.passCount}/${evaluation.results.totalRuns}` },
        { label: copy.markdownRequestsLabel, value: String(evaluation.evaluation.requests) },
        { label: copy.markdownTimeoutLabel, value: String(evaluation.evaluation.timeoutMs) },
        { label: copy.markdownMaxConcurrencyLabel, value: String(evaluation.evaluation.maxConcurrency) },
        { label: copy.markdownInstallStrategyLabel, value: evaluation.workspace.installStrategy },
        { label: copy.markdownSkillSourceLabel, value: `${evaluation.workspace.skillSource.type} ${evaluation.workspace.skillSource.skillPath}` },
        { label: copy.markdownProfilesLabel, value: evaluation.comparison.profiles.map((profile) => profile.id).join(", ") },
        { label: copy.markdownVariantsLabel, value: evaluation.comparison.variants.map((variant) => variant.variantDisplayName).join(", ") },
      ]);
      for (const prompt of evaluation.task.prompts) {
        doc.bullet(`${copy.markdownPromptPrefix} ${prompt.id}: ${prompt.description}`);
      }
      for (const source of evaluation.workspace.sources) {
        doc.bullet(`${copy.markdownWorkspaceSourcePrefix} ${source.type}: ${source.path || source.target}`);
      }
      doc.blank();
      for (const cell of evaluation.results.cells) {
        doc.bullet(
          `${copy.markdownCellPrefix} ${cell.promptId} / ${cell.variantDisplayName} / ${cell.profileId}: ${formatPercent(cell.successRatio)} (${cell.passCount}/${cell.completedRuns})`,
        );
      }
      doc.blank();
    }
  }

  doc.paragraph(markdownLink(copy.markdownBackLabel, "/ai-sdlc/skills/"));
  return doc.finish({ trailingNewline: false });
}

export function formatSkillSuccessRatio(value: number) {
  return formatPercent(value);
}
