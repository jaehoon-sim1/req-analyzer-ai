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
  docPage?: string;
}

export interface TestSection {
  storyId: string;
  sectionTitle: string;
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
