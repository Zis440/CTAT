// features/assessment/scl90/index.ts

import type { TestModule } from "../registry";

// This file is the ONLY file needed until the test is ready to be built.
// When development starts, add pages/, components/, hooks/, services/, types/
// alongside this file — nothing else in the project needs to change.

export const metadata: Pick<TestModule, "slug" | "name"> = {
  slug: "scl90",
  name: "Psychological symptom checklist intelligence",
};
