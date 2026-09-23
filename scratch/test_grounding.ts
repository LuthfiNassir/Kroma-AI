import { parseTabularData, generateInitialDashboard, SAMPLE_DATASETS } from "../lib/dataEngine";
import { buildOllamaSystemPrompt, classifyQuestion } from "../lib/ollama";
import { validateAndGroundResponse } from "../lib/responseValidator";

const parsed = parseTabularData(SAMPLE_DATASETS.churn, "csv");
const dashboard = generateInitialDashboard(parsed);
const profile = dashboard.profile!;
const factPack = profile.factPack!;

const prompt1 = "Break down Churn_Risk by High, Medium, and Low. For each group give: customer count, percentage, average Monthly_Revenue, average Usage_Hours, average Support_Tickets, average NPS, average Feature_Adoption. Then verify that every number reconciles with the full dataset.";
const prompt2 = "What is the overall average Monthly_Revenue? Show how it reconciles with the High, Medium, and Low groups.";

// Synthetic bad response 1 (hallucinated 3, 8, 19)
const hallucinated1 = `
**[Direct Answer]**
High Risk: 3 customers (10%), Medium Risk: 8 customers (26.7%), Low Risk: 19 customers (63.3%)
`;

// Synthetic bad response 2 (hallucinated 720.17)
const hallucinated2 = `
The overall average Monthly_Revenue is $720.17.
`;

console.log("Testing Grounding on Prompt 1 with hallucinated response:");
const res1 = validateAndGroundResponse(hallucinated1, "initial insight", factPack, prompt1);
console.log("Flags 1:", res1.flags);
console.log(res1.explanation);

console.log("\n==================================================\n");
console.log("Testing Grounding on Prompt 2 with hallucinated response:");
const res2 = validateAndGroundResponse(hallucinated2, "initial insight", factPack, prompt2);
console.log("Flags 2:", res2.flags);
console.log(res2.explanation);
