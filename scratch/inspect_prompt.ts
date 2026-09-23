import { parseTabularData, generateInitialDashboard, SAMPLE_DATASETS } from "../lib/dataEngine";
import { buildOllamaSystemPrompt, classifyQuestion } from "../lib/ollama";
import { validateAndGroundResponse } from "../lib/responseValidator";

const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
const dashboard = generateInitialDashboard(parsed);
const data = parsed.data;
const profile = dashboard.profile!;
const factPack = profile.factPack!;

const prompt1 = "Break down Churn_Risk by High, Medium, and Low. For each group give: customer count, percentage, average Monthly_Revenue, average Usage_Hours, average Support_Tickets, average NPS, average Feature_Adoption. Then verify that every number reconciles with the full dataset.";
const prompt2 = "What is the overall average Monthly_Revenue? Show how it reconciles with the High, Medium, and Low groups.";

console.log("Prompt 1 Category:", classifyQuestion(prompt1));
console.log("Prompt 2 Category:", classifyQuestion(prompt2));

const sys1 = buildOllamaSystemPrompt({
  schema: "Customer_ID, Segment, Churn_Risk, Monthly_Revenue, Usage_Hours, Support_Tickets, NPS, Feature_Adoption, Tenure_Months",
  sampleData: data,
  profile,
  factPack,
  question: prompt1,
});

const sys2 = buildOllamaSystemPrompt({
  schema: "Customer_ID, Segment, Churn_Risk, Monthly_Revenue, Usage_Hours, Support_Tickets, NPS, Feature_Adoption, Tenure_Months",
  sampleData: data,
  profile,
  factPack,
  question: prompt2,
});

console.log("\n--- SYS 1 FOCUSED CONTEXT ---");
console.log(sys1.substring(0, sys1.indexOf("AUTHORITATIVE COMPUTED FACTS")));

console.log("\n--- SYS 2 FOCUSED CONTEXT ---");
console.log(sys2.substring(0, sys2.indexOf("AUTHORITATIVE COMPUTED FACTS")));

