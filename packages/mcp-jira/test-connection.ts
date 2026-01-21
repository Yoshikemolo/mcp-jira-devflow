/**
 * Debug the exact search response format
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dirname, "../../.env") });

async function main() {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  console.log("Testing search with all needed fields...\n");

  const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql: "project = CS ORDER BY created DESC",
      maxResults: 2,
      fields: [
        "summary",
        "description",
        "status",
        "priority",
        "issuetype",
        "project",
        "assignee",
        "reporter",
        "created",
        "updated",
        "labels",
        "components"
      ],
    }),
  });

  console.log(`Status: ${response.status}`);
  const data = await response.json();

  if (response.ok) {
    console.log(`\nResponse structure:`);
    console.log(`  Top-level keys: ${Object.keys(data).join(", ")}`);
    console.log(`  Issues count: ${data.issues?.length}`);

    if (data.issues?.[0]) {
      console.log(`\nFirst issue structure:`);
      console.log(JSON.stringify(data.issues[0], null, 2));
    }
  } else {
    console.log(`\nError response:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
