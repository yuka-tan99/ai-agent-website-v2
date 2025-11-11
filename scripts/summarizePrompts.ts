import { buildAllPromptSummaries } from "../lib/ai/summarizePromptBlocks";
import {
  CORE_PROMPT,
  RAG_RULES,
  USER_SEGMENTATION_RULES,
  COMMUNICATION_STYLE_RULES,
  THREE_LEVEL_ARCHITECTURE_PROMPT,
  REPORT_CONTEXT,
} from "../lib/reports/prompts";

async function main() {
  await buildAllPromptSummaries({
    CORE_PROMPT,
    RAG_RULES,
    USER_SEGMENTATION_RULES,
    COMMUNICATION_STYLE_RULES,
    THREE_LEVEL_ARCHITECTURE_PROMPT,
    REPORT_CONTEXT,
  });
  console.log("✅ Summaries cached in promptCache.json");
}

main();
