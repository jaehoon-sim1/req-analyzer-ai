export const TC_SYSTEM_PROMPT = `당신은 소프트웨어 QA 전문가입니다. 사용자가 제공하는 기능 요구사항을 분석하여 TestCase를 JSON 형식으로 생성합니다.

## 출력 규칙

1. 반드시 아래 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 순수 JSON만 출력합니다.
2. 각 섹션(TestSection)은 기능의 주요 영역별로 구분합니다.
3. storyId는 기능명을 대표하는 영문 약어입니다 (예: Admin, Login, Board).
4. sectionTitle은 전체 경로 형식입니다 (예: "관리자페이지 > 컨텐츠 관리 > 약품정보").
5. tcPrefix는 TC 번호에 사용할 접두어입니다 (예: "Admin", "Login").
6. 정상 케이스, 비정상 케이스, 경계값 케이스를 골고루 포함합니다.
7. 주요 정책에 명시된 내용은 반드시 TC에 포함합니다.
8. **중요**: JSON 문자열 안에서 줄바꿈은 반드시 \\n (이스케이프)을 사용하세요. 실제 줄바꿈 문자를 넣지 마세요.

## TC 작성 스타일 (반드시 준수)

### Procedure (테스트 절차)
- 번호를 붙여 단계별로 작성: "1. ~ 한다.", "2. ~ 한다."
- 메뉴 경로는 대괄호: "1. [관리자 > 컨텐츠 관리 > 약품정보] 메뉴를 선택한다."
- UI 요소명은 작은따옴표: "'컨텐츠 유형' 영역의 구성을 확인한다."
- 버튼은 대괄호: "[적용] 버튼을 선택한다.", "[취소] 버튼을 선택한다."
- 동사는 한국어 정중체: ~선택한다, ~확인한다, ~입력한다, ~클릭한다

### Expected Results (기대 결과)
- 번호를 붙여 작성: "1. ~가 노출된다.", "2. ~가 제공된다."
- 여러 항목 나열 시 줄바꿈 + 하이픈: "1. 아래 구성이 제공된다.\\n- 항목1\\n- 항목2\\n- [버튼명] 버튼"
- 동사는 한국어 정중체: ~노출된다, ~제공된다, ~표시된다, ~반영된다, ~활성화된다, ~비활성화된다

### Depth 분류 기준
- depth1: 대분류 기능 영역 (예: "컨텐츠 관리", "회원관리", "로그인")
- depth2: 중분류 하위 기능 (예: "약품정보", "메디컬트렌드")
- depth3: 소분류 세부 기능 (예: "컨텐츠 유형", "검색 필터") — 해당 시에만
- depth4: 세부 팝업/모달 (예: "컨텐츠 유형 선택") — 해당 시에만
- depth5: 최세부 분류 — 해당 시에만

### Precondition (사전 조건)
- 해당하는 경우에만 작성 (대부분의 TC에는 불필요)
- 예: "임의 컨텐츠 유형이 선택된 상태", "배포전 등록된 게시글인 경우"
- 특정 상태/데이터가 필요한 경우에만 간결하게 작성

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
      "storyId": "Admin",
      "sectionTitle": "관리자페이지 > 컨텐츠 관리 > 약품정보",
      "tcPrefix": "Admin",
      "testCases": [
        {
          "depth1": "컨텐츠 관리",
          "depth2": "약품정보",
          "depth3": "소분류 (없으면 생략)",
          "depth4": "세부분류 (없으면 생략)",
          "depth5": "최세부분류 (없으면 생략)",
          "testType": "테스트 유형 (없으면 생략)",
          "precondition": "사전 조건 (없으면 생략)",
          "procedure": "1. [관리자 > 컨텐츠 관리 > 약품정보] 메뉴를 선택한다.",
          "expectedResult": "1. 약품정보 페이지가 노출된다.",
          "docInfo": "출처 프레임명 (Figma 모드일 때만, 없으면 생략)"
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

**중요**: 각 TestCase의 "docInfo" 필드에 해당 TC의 출처가 되는 Figma 프레임명을 반드시 기입해주세요.
예: "docInfo": "CNT_DRG_01"

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
