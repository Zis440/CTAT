// features/assessment/registry.ts

export type TestStatus = "active" | "coming-soon";

export interface TestModule {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  status: TestStatus;
  icon: string;
  route: string; // e.g. "/assessment/tat"
  creditCost: number; // 0 if coming-soon
  ageGroup?: string; // e.g. "Adults", "Children", "Adolescents"
  category?: string; // e.g. "Projective", "Behavioral", "Symptom Checklist"
  minAge?: number;
  maxAge?: number;
  duration?: string;
  id?: string;
}

export const TEST_REGISTRY: TestModule[] = [
  {
    id: "screening",
    slug: "screening-tool",
    name: "Employee Mental Health & Wellbeing",
    shortName: "Employee Mental Health & Wellbeing",
    description: "Initial rapid assessment combining basic cognitive tasks and behavioral screening.",
    icon: "clipboard-list",
    category: "General Screening",
    ageGroup: "19-60 Years",
    minAge: 19,
    maxAge: 60,
    duration: "10-15 min",
    status: "active",
    route: "/session/new",
    creditCost: 99,
  },
  {
    slug: "advance-screening",
    name: "Advance Screening",
    shortName: "Advance Screening",
    description: "Comprehensive screening tool for organizational advanced assessments.",
    status: "coming-soon",
    icon: "clipboard-list",
    route: "/session/new",
    creditCost: 15,
    category: "Screening Tool",
    ageGroup: "Adults",
  },
  {
    slug: "intermediate-screening",
    name: "Intermediate Screening",
    shortName: "Intermediate Screening",
    description: "Standard screening tool for organizational intermediate assessments.",
    status: "coming-soon",
    icon: "clipboard-list",
    route: "/session/new",
    creditCost: 12,
    category: "Screening Tool",
    ageGroup: "Adults",
  },
  {
    slug: "tat",
    name: "Narrative Intelligence",
    shortName: "Narrative Intelligence",
    description:
      "Narrative-based projective assessment using card stimuli to reveal underlying motives, concerns, and personality dynamics.",
    status: "active",
    icon: "brain",
    route: "/session/new",
    creditCost: 49,
    category: "Projective",
    ageGroup: "Adults & Adolescents",
    minAge: 9,
  },
  {
    slug: "m-paci",
    name: "Pre Adolescent Personality Assessment Intelligence",
    shortName: "Pre Adolescent Personality Assessment Intelligence",
    description:
      "Self-report inventory assessing emerging personality patterns and clinical syndromes in pre-adolescents.",
    status: "coming-soon",
    icon: "heart",
    route: "/assessment/m-paci",
    creditCost: 20,
    category: "Self-Report Inventory",
    ageGroup: "Pre-Adolescents (9–12)",
  },
  {
    slug: "conners",
    name: "Attention Deficit And Hyperactivity Intelligence",
    shortName: "Attention Deficit And Hyperactivity Intelligence",
    description:
      "Multi-informant assessment for ADHD, behavioral, and emotional problems in children and adolescents.",
    status: "coming-soon",
    icon: "activity",
    route: "/assessment/conners",
    creditCost: 15,
    category: "Behavioral Rating",
    ageGroup: "Children & Adolescents",
  },
  {
    slug: "scl90",
    name: "Psychological Symptom Checklist Intelligence",
    shortName: "Psychological Symptom Checklist Intelligence",
    description:
      "Broad-spectrum symptom inventory measuring psychological distress across nine primary dimensions.",
    status: "coming-soon",
    icon: "clipboard-list",
    route: "/assessment/scl90",
    creditCost: 8,
    category: "Symptom Checklist",
    ageGroup: "Adults",
  },
  {
    slug: "caars",
    name: "Adult Attention Deficit And Hyperactivity Intelligence",
    shortName: "Adult Attention Deficit And Hyperactivity Intelligence",
    description:
      "Comprehensive assessment of ADHD symptoms and related problems in adults.",
    status: "coming-soon",
    icon: "zap",
    route: "/assessment/caars",
    creditCost: 12,
    category: "Behavioral Rating",
    ageGroup: "Adults (18+)",
  },
  {
    slug: "dsmd-adolescent",
    name: "Adolescent Developmental And Behavioral Intelligence",
    shortName: "Adolescent Developmental And Behavioral Intelligence",
    description:
      "Standardized measure of behavioral and emotional difficulties in adolescents within educational settings.",
    status: "coming-soon",
    icon: "graduation-cap",
    route: "/assessment/dsmd-adolescent",
    creditCost: 10,
    category: "Behavioral Assessment",
    ageGroup: "Adolescents (12–18)",
  },
  {
    slug: "dsmd-child",
    name: "Child Developmental And Behavioral Intelligence",
    shortName: "Child Developmental And Behavioral Intelligence",
    description:
      "Standardized measure of behavioral and emotional difficulties in children within educational settings.",
    status: "coming-soon",
    icon: "baby",
    route: "/assessment/dsmd-child",
    creditCost: 10,
    category: "Behavioral Assessment",
    ageGroup: "Children (5–12)",
  },
  {
    slug: "maci",
    name: "Adolescent Personality Intelligence",
    shortName: "Adolescent Personality Intelligence",
    description:
      "Self-report inventory assessing emerging personality patterns and clinical syndromes in adolescents.",
    status: "coming-soon",
    icon: "activity",
    route: "/assessment/maci",
    creditCost: 18,
    category: "Self-Report Inventory",
    ageGroup: "Adolescents (13–19)",
  },
  {
    slug: "mcmi",
    name: "Adult Personality Intelligence",
    shortName: "Adult Personality Intelligence",
    description:
      "Psychological assessment tool intended to provide information on personality traits and psychopathology.",
    status: "coming-soon",
    icon: "brain",
    route: "/assessment/mcmi",
    creditCost: 25,
    category: "Self-Report Inventory",
    ageGroup: "Adults",
  },
  {
    slug: "freud-dream",
    name: "Dream Insite Intelligence",
    shortName: "Dream Insite Intelligence",
    description:
      "Psychoanalytic approach to analyzing the manifest and latent content of dreams to uncover unconscious desires.",
    status: "coming-soon",
    icon: "heart",
    route: "/assessment/freud-dream",
    creditCost: 5,
    category: "Psychoanalytic",
    ageGroup: "Adults",
  },
];

// ─────────────────────────────────────────────────────────────────
// TO ADD A NEW TEST:
//  1. Create a new folder under features/assessment/<test-slug>/
//  2. Add an entry to TEST_REGISTRY above
//  3. Register the route in app/router.tsx
//  That's it. No other file needs to be touched.
// ─────────────────────────────────────────────────────────────────
