import { getAiSdlcTopicBySlug } from "../../../../lib/ai-sdlc";
import { getSkillDetailMarkdown } from "../../../../lib/skills-page";
import { getApprovedSkills } from "../../../../lib/skills-repositories";

export async function getStaticPaths() {
  const skills = await getApprovedSkills();

  return skills.map((skill) => ({
    params: {
      repository: skill.repositorySlug,
      skill: skill.slug,
    },
    props: { skill },
  }));
}

export async function GET({
  props,
}: {
  props: { skill: Awaited<ReturnType<typeof getApprovedSkills>>[number] };
}) {
  const topic = await getAiSdlcTopicBySlug("skills");

  if (!topic?.skillDetail) {
    return new Response("", { status: 500 });
  }

  return new Response(getSkillDetailMarkdown(props.skill, topic.skillDetail), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
