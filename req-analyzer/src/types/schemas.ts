import { z } from 'zod';

const confidenceSchema = z.enum(['high', 'medium', 'low']).optional();

// SummarySection schema
export const SummarySectionSchema = z.object({
  overview: z.string(),
  keyPoints: z.array(z.string()),
  confidence: confidenceSchema,
});

// FeatureSection schema
export const FeatureSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  category: z.string().optional(),
});

export const FeatureSectionSchema = z.object({
  features: z.array(FeatureSchema),
  confidence: confidenceSchema,
});

// TestPointSection schema
export const TestPointSchema = z.object({
  id: z.number(),
  category: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const TestPointSectionSchema = z.object({
  testPoints: z.array(TestPointSchema),
  confidence: confidenceSchema,
});

// AmbiguitySection schema
export const AmbiguityItemSchema = z.object({
  originalText: z.string(),
  issue: z.string(),
  suggestion: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
});

export const AmbiguitySectionSchema = z.object({
  items: z.array(AmbiguityItemSchema),
  confidence: confidenceSchema,
});

// MissingSection schema
export const MissingItemSchema = z.object({
  category: z.string(),
  description: z.string(),
  reason: z.string(),
});

export const MissingSectionSchema = z.object({
  items: z.array(MissingItemSchema),
  confidence: confidenceSchema,
});

// QAQuestionSection schema
export const QAQuestionSchema = z.object({
  id: z.number(),
  question: z.string(),
  context: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const QAQuestionSectionSchema = z.object({
  questions: z.array(QAQuestionSchema),
  confidence: confidenceSchema,
});

// Map of section keys to their schemas
export const SectionSchemas = {
  summary: SummarySectionSchema,
  features: FeatureSectionSchema,
  testPoints: TestPointSectionSchema,
  ambiguity: AmbiguitySectionSchema,
  missingRequirements: MissingSectionSchema,
  qaQuestions: QAQuestionSectionSchema,
} as const;

export type SectionSchemaKey = keyof typeof SectionSchemas;
