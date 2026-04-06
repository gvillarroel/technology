import {
  getAiSdlcData,
  getAiSdlcHarnessToolsMarkdown,
  getAiSdlcResolvedToolGroups,
  getAiSdlcSkillsMarkdown,
  getAiSdlcTopicMarkdown,
  getAiSdlcTopics,
} from "../../lib/ai-sdlc";
import { getSkillsCatalogData } from "../../lib/skills-repositories";

export async function getStaticPaths() {
  const topics = await getAiSdlcTopics();

  return topics.map((topic) => ({
    params: {
      slug: topic.slug,
    },
    props: { topic },
  }));
}

export async function GET({
  props,
}: {
  props: { topic: Awaited<ReturnType<typeof getAiSdlcTopics>>[number] };
}) {
  const { overview } = await getAiSdlcData();
  const markdown =
    props.topic.slug === "skills"
      ? getAiSdlcSkillsMarkdown(props.topic, overview, await getSkillsCatalogData())
      : props.topic.slug === "harness-tools"
        ? getAiSdlcHarnessToolsMarkdown(props.topic, overview, await getAiSdlcResolvedToolGroups(props.topic))
      : getAiSdlcTopicMarkdown(props.topic, overview);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
