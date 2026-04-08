export interface TestCase {
  depth1: string;
  depth2: string;
  depth3?: string;
  depth4?: string;
  depth5?: string;
  testType?: string;
  precondition?: string;
  procedure: string;
  expectedResult: string;
  docInfo?: string;
  docPage?: string;
}

export interface TestSection {
  storyId: string;
  sectionTitle: string;
  tcPrefix?: string;
  testCases: TestCase[];
}

export interface TCRequest {
  functionName: string;
  description: string;
  policies: string;
}

export interface TCGenerateResponse {
  sections: TestSection[];
  functionName: string;
}

// === TC vs 기획서 비교 ===

export interface ParsedTC {
  tcNo: string;
  depth1?: string;
  depth2?: string;
  depth3?: string;
  procedure: string;
  expectedResult: string;
  precondition?: string;
}

export interface ParsedTCSection {
  sectionTitle: string;
  testCases: ParsedTC[];
}

export interface ComparisonGap {
  requirement: string;
  severity: "high" | "medium" | "low";
  suggestedProcedure: string;
  suggestedExpectedResult: string;
}

export interface CoverageItem {
  requirement: string;
  matchedTCs: string[];
  coverage: "full" | "partial" | "none";
}

export interface ComparisonResult {
  summary: {
    totalRequirements: number;
    coveredCount: number;
    coveragePercent: number;
    missingTCCount: number;
    missingExceptionCount: number;
  };
  missingTCs: ComparisonGap[];
  missingExceptions: ComparisonGap[];
  coverageMatrix: CoverageItem[];
}
