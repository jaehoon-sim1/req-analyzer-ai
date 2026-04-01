import {
  ActivityHandler,
  TurnContext,
  ActivityTypes,
} from 'botbuilder';
import { getAnthropicClient, CHAT_MODEL } from '@/lib/anthropic';
import { retrieveContext, buildSystemPrompt } from '@/lib/rag';
import { createSupabaseAdmin } from '@/lib/supabase/server';

export class DoctorInfoBot extends ActivityHandler {
  constructor() {
    super();

    // 메시지 수신 처리
    this.onMessage(async (context: TurnContext, next: () => Promise<void>) => {
      const userMessage = context.activity.text?.trim();
      if (!userMessage) {
        await next();
        return;
      }

      const teamsUserId = context.activity.from.id;
      const teamsUserName = context.activity.from.name || '알 수 없는 사용자';

      // 타이핑 인디케이터 전송
      await context.sendActivity({ type: ActivityTypes.Typing });

      try {
        // Teams 사용자 매핑 저장/업데이트
        const admin = createSupabaseAdmin();
        await admin
          .from('teams_user_mappings')
          .upsert(
            {
              teams_user_id: teamsUserId,
              teams_user_name: teamsUserName,
              teams_conversation_ref: TurnContext.getConversationReference(
                context.activity
              ),
            },
            { onConflict: 'teams_user_id' }
          );

        // RAG 컨텍스트 검색
        const { sources, contextText } = await retrieveContext(userMessage);
        const systemPrompt = buildSystemPrompt(contextText);

        // Claude API 호출
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: CHAT_MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const responseText =
          response.content[0].type === 'text'
            ? response.content[0].text
            : '응답을 생성할 수 없습니다.';

        // 참고 자료 정보 첨부
        let replyText = responseText;
        if (sources.length > 0) {
          const sourceList = sources
            .slice(0, 3)
            .map((s) => `- ${s.title} (유사도: ${(s.similarity * 100).toFixed(0)}%)`)
            .join('\n');
          replyText += `\n\n---\n📚 **참고자료:**\n${sourceList}`;
        }

        await context.sendActivity(replyText);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        await context.sendActivity(
          `죄송합니다. 오류가 발생했습니다: ${errorMsg}`
        );
      }

      await next();
    });

    // 봇에 멤버 추가 시 환영 메시지
    this.onMembersAdded(async (context: TurnContext, next: () => Promise<void>) => {
      const membersAdded = context.activity.membersAdded || [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            '안녕하세요! 저는 **닥터인포** AI 비서입니다. 🩺\n\n' +
              '팀의 내부 지식을 기반으로 질문에 답변해드립니다.\n' +
              '무엇이든 자유롭게 물어보세요!'
          );
        }
      }
      await next();
    });
  }
}
