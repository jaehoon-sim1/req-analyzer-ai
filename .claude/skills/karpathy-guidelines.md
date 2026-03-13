---
name: karpathy-guidelines
description: |
  Andrej Karpathy의 소프트웨어 개발 원칙을 기반으로 로드맵, PRD, 개발 계획을 검토하고 생성합니다.
  "A Recipe for Training Neural Networks" + "Software 3.0" + "Agentic Engineering" 원칙을 통합합니다.
trigger: |
  Use when: 로드맵 생성, PRD 리뷰, 개발 계획 수립, 스프린트 계획, 아키텍처 설계 검토 시.
  Keywords: karpathy, 로드맵, roadmap, 개발 계획, 아키텍처, 점진적 복잡도, incremental, agentic engineering.
---

# Karpathy Guidelines Skill

## 목적

Andrej Karpathy의 소프트웨어/AI 개발 원칙을 체계화하여, 로드맵·PRD·스프린트 계획 생성 시 품질 체크리스트로 활용합니다.

---

## 핵심 원칙 (7 Principles)

### P1. 점진적 복잡도 (Incremental Complexity)

> "The recipe builds from simple to complex and at every step validates hypotheses."

- **절대** 검증되지 않은 복잡도를 한꺼번에 도입하지 않는다
- 각 스프린트/마일스톤은 이전 단계의 검증 위에 쌓아야 한다
- MVP → Enhancement → Advanced 순서를 엄격히 지킨다

**로드맵 적용 체크리스트:**
- [ ] 첫 마일스톤이 가장 단순한 동작 가능한 버전인가?
- [ ] 각 마일스톤이 독립적으로 배포/검증 가능한가?
- [ ] 복잡한 기능(OCR, 외부 연동 등)이 후순위에 배치되었는가?
- [ ] 각 단계의 완료 기준(Acceptance Criteria)이 명확한가?

---

### P2. 먼저 데이터를 확인하라 (Inspect Your Data First)

> "The first step is to not touch any code at all and instead begin by thoroughly inspecting your data."

- 구현 전에 입력 데이터의 특성을 완전히 이해한다
- 엣지 케이스, 포맷 변형, 품질 편차를 먼저 파악한다
- 데이터 기반으로 설계 결정을 내린다

**로드맵 적용 체크리스트:**
- [ ] 사용자 입력 데이터의 실제 샘플을 수집/분석했는가?
- [ ] 입력 제약 조건(크기, 형식, 인코딩)이 정의되었는가?
- [ ] 엣지 케이스(빈 입력, 초대형 입력, 잘못된 형식)가 고려되었는가?
- [ ] PoC 단계에서 실제 데이터로 검증하는 태스크가 있는가?

---

### P3. 빠른 검증을 위한 설계 (Design for Fast Verification)

> "Optimize the feedback loop between generation and verification. Make verification fast and easy."

- 생성과 검증 사이의 피드백 루프를 최적화한다
- 시각적 인터페이스를 텍스트 전용보다 우선한다
- 사용자가 AI 출력을 빠르게 평가할 수 있어야 한다

**로드맵 적용 체크리스트:**
- [ ] 각 기능에 즉각적 시각 피드백이 포함되어 있는가?
- [ ] 결과를 구조화된 형태(테이블, 리스트)로 표시하는가?
- [ ] 사용자가 결과를 수정/피드백할 수 있는 인터랙션이 있는가?
- [ ] 로딩/진행률 UI가 설계되어 있는가?

---

### P4. AI를 짧은 줄에 묶어라 (Keep AI on a Tight Leash)

> "Keep the AI on a tight leash. Design for graduated control."

- AI 자율성의 수준을 사용자가 조절할 수 있어야 한다
- AI 출력은 항상 구조화되고 예측 가능해야 한다
- 불확실한 AI 출력에는 신뢰도/근거를 함께 제공한다

**로드맵 적용 체크리스트:**
- [ ] AI 출력 포맷이 스키마로 강제되는가? (Structured Output / JSON Mode)
- [ ] AI 응답의 불확실성을 사용자에게 표시하는가?
- [ ] 프롬프트 인젝션/탈옥 방어가 계획되어 있는가?
- [ ] AI 실패 시 폴백(fallback) 전략이 있는가?

---

### P5. 사양 중심 개발 (Specification-Driven Development)

> "Human expertise shifts upstream to precise specification, architecture, and governance."

- 구현보다 사양(Spec)을 먼저 확정한다
- PRD → 설계 문서 → 구현 순서를 지킨다
- AI가 구현을 담당하더라도 아키텍처 결정은 인간이 한다

**로드맵 적용 체크리스트:**
- [ ] 각 FR/NFR이 구현 가능한 수준으로 상세한가?
- [ ] AC(Acceptance Criteria)가 Given-When-Then으로 작성되었는가?
- [ ] 기술 스택과 아키텍처 결정이 PoC 단계에 포함되어 있는가?
- [ ] 설계 문서 작성 태스크가 구현 태스크보다 앞에 있는가?

---

### P6. 집요한 테스트 (Test Relentlessly)

> "The single biggest differentiator between agentic engineering and vibe coding is testing."

- 테스트가 없으면 AI 에이전트는 깨진 코드를 "완료"라고 선언한다
- 견고한 테스트 스위트가 불안정한 에이전트를 안정적인 시스템으로 변환한다
- 각 기능에 자동화된 테스트가 반드시 동반되어야 한다

**로드맵 적용 체크리스트:**
- [ ] 각 스프린트에 테스트 작성 태스크가 포함되어 있는가?
- [ ] E2E 테스트가 Acceptance Criteria와 1:1 매핑되는가?
- [ ] CI/CD 파이프라인에 자동 테스트가 포함되어 있는가?
- [ ] 성능 테스트(응답 시간 등)가 계획되어 있는가?
- [ ] 회귀 테스트(regression test) 전략이 있는가?

---

### P7. LLM 불완전성 설계 (Design Around LLM Imperfections)

> "Today's LLMs are not general-purpose AGI. Builders must accept and design around the imperfections."

- LLM은 "들쭉날쭉한 지능(jagged intelligence)"을 가진다
- 잘하는 영역과 못하는 영역이 극명하게 다르다
- 실패를 전제로 설계하고, 재시도/폴백을 내장한다

**로드맵 적용 체크리스트:**
- [ ] AI 출력 검증(파싱, 스키마 체크) 로직이 계획되어 있는가?
- [ ] 토큰 제한에 따른 입력 청킹 전략이 있는가?
- [ ] AI 응답 실패 시 재시도 로직이 포함되어 있는가?
- [ ] 프롬프트 버전 관리 및 A/B 테스트가 고려되었는가?
- [ ] LLM 비용 모니터링 및 최적화 계획이 있는가?

---

## 로드맵 생성 시 적용 가이드

로드맵이나 개발 계획을 생성/리뷰할 때, 아래 순서로 7가지 원칙을 적용합니다:

### Phase 1: 계획 수립 시

```
1. [P2] 데이터/입력 분석 → 실제 사용 시나리오 파악
2. [P5] 사양 확정 → PRD, AC, 기술 스택 결정
3. [P1] 점진적 마일스톤 → 단순→복잡 순서로 배치
```

### Phase 2: 스프린트 설계 시

```
4. [P4] AI 제어 전략 → 출력 스키마, 프롬프트 설계
5. [P3] 검증 UX 설계 → 빠른 피드백 루프
6. [P7] 불완전성 대응 → 폴백, 재시도, 청킹
```

### Phase 3: 품질 보증 시

```
7. [P6] 테스트 전략 → E2E, 회귀, 성능 테스트
```

---

## 점수표 (Scorecard)

로드맵 품질을 0~100점으로 평가합니다. 각 원칙별 체크리스트를 평가하여 점수를 산출합니다.

| 원칙 | 배점 | 평가 기준 |
|------|------|-----------|
| P1 점진적 복잡도 | 20 | 마일스톤 순서 적절성, 단계별 독립 검증 가능성 |
| P2 데이터 우선 | 10 | 입력 분석, 제약 조건, 엣지 케이스 정의 |
| P3 빠른 검증 | 15 | 시각 피드백, UX 피드백 루프 |
| P4 AI 제어 | 15 | 출력 구조화, 신뢰도 표시, 보안 |
| P5 사양 중심 | 10 | AC 품질, 기술 결정 시점 |
| P6 테스트 | 20 | 테스트 커버리지, 자동화, CI/CD |
| P7 불완전성 대응 | 10 | 폴백, 재시도, 비용 관리 |
| **합계** | **100** | |

### 등급

| 점수 | 등급 | 의미 |
|------|------|------|
| 90~100 | A | 프로덕션 준비 완료 |
| 70~89 | B | 보완 후 진행 가능 |
| 50~69 | C | 주요 항목 보완 필요 |
| 0~49 | D | 재설계 권장 |

---

## 참조

- [A Recipe for Training Neural Networks](http://karpathy.github.io/2019/04/25/recipe/) — Andrej Karpathy
- [Software 3.0: Software in the Age of AI](https://www.latent.space/p/s3) — Latent Space
- [Agentic Engineering](https://addyosmani.com/blog/agentic-engineering/) — Addy Osmani
- [From Vibe Coding to Agentic Engineering](https://thenewstack.io/vibe-coding-is-passe/) — The New Stack
