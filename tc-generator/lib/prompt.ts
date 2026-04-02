export const TC_SYSTEM_PROMPT = `당신은 소프트웨어 QA 전문가입니다. 사용자가 제공하는 기능 요구사항을 분석하여 TestCase를 JSON 형식으로 생성합니다.

## 출력 규칙

1. 반드시 아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 순수 JSON만 출력합니다.
2. 각 섹션(TestSection)은 기능의 주요 영역별로 구분합니다.
3. storyId는 기능명 약어 + 순번 형식입니다 (예: LG-001, LG-002).
4. sectionTitle은 "Depth1 > Depth2 대분류" 형식입니다 (예: "로그인 > 화면 구성").
5. 각 TestCase의 procedure와 expectedResult는 번호를 붙여 단계별로 작성합니다.
6. 정상 케이스, 비정상 케이스, 경계값 케이스를 골고루 포함합니다.
7. 주요 정책에 명시된 내용은 반드시 TC에 포함합니다.
8. **중요**: JSON 문자열 안에서 줄바꿈은 반드시 \\n (이스케이프)을 사용하세요. 실제 줄바꿈 문자를 넣지 마세요.

## 섹션 구성 가이드

- 화면 구성: UI 요소 존재 여부, 초기 상태 확인
- 정상 동작: 정상적인 기능 수행 케이스
- 유효성 검증: 입력값 검증, 필수값 미입력, 잘못된 입력
- 정책 검증: 주요 정책에 명시된 비즈니스 규칙 검증
- 경계값/예외: 특수문자, 최대길이, 연속 동작 등

## JSON 출력 형식

{
  "sections": [
    {
      "storyId": "XX-001",
      "sectionTitle": "기능 > 대분류",
      "testCases": [
        {
          "depth1": "기능명",
          "depth2": "중분류",
          "depth3": "소분류 (없으면 생략)",
          "depth4": "세부분류 (없으면 생략)",
          "depth5": "최세부분류 (없으면 생략)",
          "testType": "테스트 유형 (없으면 생략)",
          "precondition": "사전 조건 (없으면 생략)",
          "procedure": "1. 테스트 절차 단계1\\n2. 테스트 절차 단계2",
          "expectedResult": "1. 기대 결과 단계1\\n2. 기대 결과 단계2",
          "docPage": "출처 프레임명 (Figma 모드일 때만, 없으면 생략)"
        }
      ]
    }
  ]
}`;

export function buildUserPrompt(
  functionName: string,
  description: string,
  policies: string
): string {
  return `다음 기능에 대한 TestCase를 생성해주세요.

기능명: [${functionName}]
기능 상세 설명: [${description}]
주요 정책: [${policies}]

위 요구사항을 분석하여 빠짐없이 TestCase를 JSON 형식으로 생성해주세요.`;
}

export function buildPdfUserPrompt(pdfText: string): string {
  return `다음 요구사항 문서 내용을 분석하여 TestCase를 생성해주세요.

--- 요구사항 문서 ---
${pdfText}
--- 문서 끝 ---

위 문서에서 기능명, 기능 상세 설명, 주요 정책을 파악하여 빠짐없이 TestCase를 JSON 형식으로 생성해주세요.`;
}

export function buildImageUserPrompt(): string {
  return `첨부된 이미지는 소프트웨어 요구사항 문서입니다. 이미지에서 텍스트와 내용을 분석하여 TestCase를 생성해주세요.

이미지에서 기능명, 기능 상세 설명, 주요 정책을 파악하여 빠짐없이 TestCase를 JSON 형식으로 생성해주세요.`;
}

export function buildFigmaUserPrompt(figmaText: string): string {
  return `다음은 Figma 디자인 페이지에서 프레임별로 추출한 UI 요소 정보입니다. 이 정보를 분석하여 TestCase를 생성해주세요.

--- Figma 디자인 요소 (프레임별) ---
${figmaText}
--- 요소 끝 ---

**중요**: 각 TestCase의 "docPage" 필드에 해당 TC의 출처가 되는 Figma 프레임명을 반드시 기입해주세요.
예: "docPage": "CNT_DRG_01"

위 UI 요소에서 화면 구성, 사용자 인터랙션, 입력 유효성 검증, 네비게이션 등을 파악하여 빠짐없이 TestCase를 JSON 형식으로 생성해주세요.`;
}

export function buildRegeneratePrompt(
  originalPrompt: string,
  previousResultSummary: string,
  feedback: string
): string {
  return `${originalPrompt}

--- 이전 생성 결과 요약 ---
${previousResultSummary}
--- 요약 끝 ---

--- 사용자 피드백 ---
${feedback}
--- 피드백 끝 ---

위 사용자 피드백을 반영하여 TestCase를 개선/보완하여 다시 생성해주세요.
이전 결과의 좋은 부분은 유지하되, 피드백에서 요청한 변경사항을 반드시 반영하세요.`;
}
