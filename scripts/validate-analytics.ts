import { validateAnalyticsDataset } from "../src/data/validate-data";

const result = validateAnalyticsDataset();

if (!result.valid) {
  console.error("Analytics dataset validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Analytics dataset validation passed.");
console.log(JSON.stringify(result.summary, null, 2));
