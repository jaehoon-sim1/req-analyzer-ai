import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
} from 'botbuilder';

let adapter: CloudAdapter | null = null;

export function getTeamsAdapter(): CloudAdapter {
  if (!adapter) {
    const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication({
      MicrosoftAppId: process.env.TEAMS_BOT_APP_ID || '',
      MicrosoftAppPassword: process.env.TEAMS_BOT_APP_PASSWORD || '',
      MicrosoftAppType: 'MultiTenant',
    });

    adapter = new CloudAdapter(botFrameworkAuth);

    // 에러 핸들러
    adapter.onTurnError = async (context, error) => {
      console.error('[Teams Bot] 오류:', error);
      await context.sendActivity(
        '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    };
  }

  return adapter;
}
