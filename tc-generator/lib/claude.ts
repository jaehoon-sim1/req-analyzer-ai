import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { TestSection } from "./types";
import { TC_SYSTEM_PROMPT } from "./prompt";

// Corporate proxy SSL workaround (development only)
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export type AIProvider = "gemini" | "openrouter" | "claude";

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("rate limit") ||
      msg.includes("rate_limit") ||
      msg.includes("429") ||
      msg.includes("too many requests") ||
      msg.includes("quota")
    );
  }
  return false;
}

const PROVIDER_NAMES: Record<AIProvider, string> = {
  openrouter: "OpenRouter",
  claude: "Claude",
  gemini: "Gemini",
};

async function withRetry<T>(
  fn: () => Promise<T>,
  provider: AIProvider,
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (isRateLimitError(error) && attempt < maxRetries) {
        const delay = (attempt + 1) * 3000; // 3초, 6초
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // 마지막 시도에서도 rate limit이면 안내 메시지 추가
      if (isRateLimitError(error)) {
        const others = (Object.keys(PROVIDER_NAMES) as AIProvider[])
          .filter((p) => p !== provider)
          .map((p) => PROVIDER_NAMES[p])
          .join(", ");
        throw new Error(
          `${PROVIDER_NAMES[provider]} API 사용량 제한 초과 (Rate Limit). ` +
          `잠시 후 다시 시도하거나, 다른 AI 제공자(${others})로 전환해주세요.`
        );
      }

      throw error;
    }
  }
  throw new Error("Unexpected retry exhaustion");
}

export async function generateTestCases(
  userPrompt: string,
  apiKey: string,
  provider: AIProvider = "gemini",
  imageBase64?: string | string[]
): Promise<TestSection[]> {
  if (!apiKey) {
    throw new Error("API 키가 입력되지 않았습니다.");
  }

  const generate = () => {
    if (provider === "claude") {
      return generateWithClaude(userPrompt, apiKey, imageBase64);
    }
    if (provider === "openrouter") {
      return generateWithOpenRouter(userPrompt, apiKey, imageBase64);
    }
    return generateWithGemini(userPrompt, apiKey, imageBase64);
  };

  return withRetry(generate, provider);
}

async function generateWithClaude(
  userPrompt: string,
  apiKey: string,
  imageBase64?: string | string[]
): Promise<TestSection[]> {
  const client = new Anthropic({ apiKey });

  type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    { type: "text" as const, text: userPrompt },
  ];

  const images = imageBase64
    ? Array.isArray(imageBase64) ? imageBase64 : [imageBase64]
    : [];

  for (const img of images) {
    const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      (content as Anthropic.ContentBlockParam[]).push({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: match[1] as ImageMediaType,
          data: match[2],
        },
      });
    }
  }

  // 첫 시도: 8192 tokens → 잘리면 16384로 재시도
  const tokenLimits = [8192, 16384];
  let lastText = "";

  for (const maxTokens of tokenLimits) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: TC_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response from Claude");
    }

    lastText = textBlock.text;

    // stop_reason이 end_turn이면 완전한 응답
    if (message.stop_reason === "end_turn") {
      return parseJsonResponse(lastText);
    }

    // max_tokens로 잘린 경우 → 더 큰 limit으로 재시도
    console.warn(`[Claude] 응답이 잘림 (stop_reason: ${message.stop_reason}, max_tokens: ${maxTokens}). 재시도...`);
  }

  // 모든 시도 후에도 잘렸으면 복구 시도
  return parseJsonResponse(lastText);
}

async function generateWithGemini(
  userPrompt: string,
  apiKey: string,
  imageBase64?: string | string[]
): Promise<TestSection[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: TC_SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 65536 },
  });

  const images = imageBase64
    ? Array.isArray(imageBase64) ? imageBase64 : [imageBase64]
    : [];

  if (images.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [userPrompt];
    for (const img of images) {
      const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();
    if (!text) throw new Error("No response from Gemini");
    return parseJsonResponse(text);
  }

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();

  if (!text) {
    throw new Error("No response from Gemini");
  }

  return parseJsonResponse(text);
}

async function generateWithOpenRouter(
  userPrompt: string,
  apiKey: string,
  imageBase64?: string | string[]
): Promise<TestSection[]> {
  type MessageContent =
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;

  const images = imageBase64
    ? Array.isArray(imageBase64) ? imageBase64 : [imageBase64]
    : [];

  let userContent: MessageContent;

  if (images.length > 0) {
    userContent = [
      { type: "text", text: userPrompt },
      ...images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img },
      })),
    ];
  } else {
    userContent = userPrompt;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [
        { role: "system", content: TC_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err?.error?.message || err?.message || `OpenRouter 오류 (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No response from OpenRouter");
  }

  return parseJsonResponse(text);
}

function fixUnescapedNewlines(jsonStr: string): string {
  // AI 모델이 JSON 문자열 값 안에 이스케이프되지 않은 실제 줄바꿈을 넣는 경우가 있음
  // 문자열 내부(따옴표 사이)의 실제 줄바꿈을 \\n으로 치환
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && (ch === "\n" || ch === "\r")) {
      // 문자열 내부의 실제 줄바꿈 → 이스케이프 처리
      if (ch === "\r" && jsonStr[i + 1] === "\n") {
        i++; // \r\n 을 한 번에 처리
      }
      result += "\\n";
      continue;
    }

    result += ch;
  }

  return result;
}

function tryRepairTruncatedJson(text: string): unknown | null {
  // max_tokens로 잘린 JSON 복구 시도
  let repaired = text.trim();

  // 열린 괄호/대괄호 수 카운트
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of repaired) {
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }

  // 문자열 안에서 잘렸으면 닫아줌
  if (inString) repaired += '"';

  // 닫히지 않은 괄호 닫기
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

function parseJsonResponse(text: string): TestSection[] {
  console.log("[parseJsonResponse] 응답 길이:", text.length, "처음 200자:", text.slice(0, 200));

  // 코드블록 제거
  let jsonText = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // JSON 부분만 추출 (앞뒤 설명 텍스트 제거)
  const jsonStart = jsonText.indexOf("{");
  const jsonEnd = jsonText.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // 2단계: 이스케이프되지 않은 줄바꿈 수정 후 재시도
    try {
      const fixed = fixUnescapedNewlines(jsonText);
      parsed = JSON.parse(fixed);
    } catch {
      // 3단계: 배열 형태 시도
      const arrStart = text.indexOf("[");
      const arrEnd = text.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd > arrStart) {
        try {
          const arrText = text.slice(arrStart, arrEnd + 1);
          const fixed = fixUnescapedNewlines(arrText);
          parsed = { sections: JSON.parse(fixed) };
        } catch {
          // 4단계: 잘린 JSON 복구 시도
          const fixedText = fixUnescapedNewlines(jsonText);
          parsed = tryRepairTruncatedJson(fixedText);
        }
      } else {
        // 4단계: 잘린 JSON 복구 시도
        const fixedText = fixUnescapedNewlines(jsonText);
        parsed = tryRepairTruncatedJson(fixedText);
      }

      if (!parsed) {
        console.error(
          "AI 응답 파싱 최종 실패. 원본 응답 (처음 800자):",
          text.slice(0, 800),
          "마지막 200자:",
          text.slice(-200)
        );

        // AI가 JSON 대신 텍스트 설명을 반환한 경우 감지
        const hasJson = text.includes("{") && text.includes("}");
        if (!hasJson) {
          throw new Error(
            "AI가 테스트 케이스를 생성하지 못했습니다.\n" +
            "입력된 요구사항이 부족하거나 불명확할 수 있습니다.\n" +
            "→ 더 상세한 요구사항을 입력하거나, 이미지로 업로드해보세요."
          );
        }

        throw new Error(
          "AI 응답을 JSON으로 파싱할 수 없습니다. 다시 시도해주세요.\n" +
          `(응답 길이: ${text.length}자, 마지막: ...${text.slice(-80)})`
        );
      }
    }
  }

  // 다양한 응답 구조 처리
  const obj = parsed as Record<string, unknown>;
  let sections: unknown[];

  if (Array.isArray(obj)) {
    // AI가 배열을 직접 반환한 경우: [{storyId, sectionTitle, testCases}, ...]
    sections = obj;
  } else if (Array.isArray(obj?.sections)) {
    // 정상 구조: {sections: [...]}
    sections = obj.sections;
  } else if (Array.isArray(obj?.testCases)) {
    // 단일 섹션 반환: {storyId, sectionTitle, testCases: [...]}
    sections = [obj];
  } else {
    // 알 수 없는 구조 → 첫 번째 배열 값을 찾아봄
    const firstArrayKey = Object.keys(obj || {}).find((k) =>
      Array.isArray(obj[k])
    );
    if (firstArrayKey) {
      const arr = obj[firstArrayKey] as unknown[];
      // 배열 요소가 testCases를 포함하는지 확인
      if (
        arr.length > 0 &&
        typeof arr[0] === "object" &&
        arr[0] !== null &&
        ("testCases" in arr[0] || "test_cases" in arr[0])
      ) {
        sections = arr;
      } else {
        console.error(
          "AI 응답 구조 불일치. parsed keys:",
          Object.keys(obj || {}),
          "첫 배열 키:",
          firstArrayKey
        );
        throw new Error(
          "AI 응답에 유효한 테스트 케이스 섹션이 없습니다. 다시 시도해주세요."
        );
      }
    } else {
      console.error(
        "AI 응답 구조 불일치. parsed:",
        JSON.stringify(parsed).slice(0, 300)
      );
      throw new Error(
        "AI 응답에 유효한 테스트 케이스 섹션이 없습니다. 다시 시도해주세요."
      );
    }
  }

  if (sections.length === 0) {
    throw new Error(
      "AI 응답에 유효한 테스트 케이스 섹션이 없습니다. 다시 시도해주세요."
    );
  }

  // 필드명 정규화 (test_cases → testCases, doc_info → docInfo 등)
  return sections.map((s: unknown) => {
    const sec = s as Record<string, unknown>;
    const testCases = (sec.testCases || sec.test_cases || []) as Record<
      string,
      unknown
    >[];
    return {
      storyId:
        (sec.storyId as string) ||
        (sec.story_id as string) ||
        (sec.id as string) ||
        "TC-001",
      sectionTitle:
        (sec.sectionTitle as string) ||
        (sec.section_title as string) ||
        (sec.title as string) ||
        "테스트 섹션",
      tcPrefix:
        (sec.tcPrefix as string) ||
        (sec.tc_prefix as string) ||
        undefined,
      testCases: testCases.map((tc) => ({
        depth1:
          (tc.depth1 as string) || (tc.depth_1 as string) || "",
        depth2:
          (tc.depth2 as string) || (tc.depth_2 as string) || "",
        depth3: (tc.depth3 as string) || (tc.depth_3 as string) || undefined,
        depth4: (tc.depth4 as string) || (tc.depth_4 as string) || undefined,
        depth5: (tc.depth5 as string) || (tc.depth_5 as string) || undefined,
        testType:
          (tc.testType as string) || (tc.test_type as string) || undefined,
        precondition:
          (tc.precondition as string) ||
          (tc.pre_condition as string) ||
          undefined,
        procedure:
          (tc.procedure as string) ||
          (tc.steps as string) ||
          (tc.test_procedure as string) ||
          "",
        expectedResult:
          (tc.expectedResult as string) ||
          (tc.expected_result as string) ||
          (tc.expected as string) ||
          "",
        docInfo:
          (tc.docInfo as string) ||
          (tc.doc_info as string) ||
          undefined,
        docPage:
          (tc.docPage as string) ||
          (tc.doc_page as string) ||
          (tc.docpage as string) ||
          undefined,
      })),
    } as TestSection;
  });
}
