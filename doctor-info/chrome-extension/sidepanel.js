// 닥터인포 Chrome 확장 사이드패널 스크립트
const APP_URL = 'https://doctor-info.vercel.app'; // 배포 후 변경

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const openFullBtn = document.getElementById('openFull');
const welcomeEl = document.getElementById('welcome');

let conversationId = null;
let isLoading = false;

// 전체 화면 열기
openFullBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL });
});

// 입력 활성화 관리
inputEl.addEventListener('input', () => {
  sendBtn.disabled = !inputEl.value.trim() || isLoading;
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
});

// Enter로 전송 (Shift+Enter는 줄바꿈)
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (inputEl.value.trim() && !isLoading) {
      sendMessage();
    }
  }
});

sendBtn.addEventListener('click', sendMessage);

function addMessage(role, content) {
  if (welcomeEl) welcomeEl.remove();

  const div = document.createElement('div');
  div.className = `msg ${role}`;

  if (role === 'assistant') {
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = '닥터인포';
    div.appendChild(label);
  }

  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = content;
  div.appendChild(text);

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return text;
}

function addTypingIndicator() {
  if (welcomeEl) welcomeEl.remove();

  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing';

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = '닥터인포';
  div.appendChild(label);

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  div.appendChild(typing);

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  inputEl.value = '';
  inputEl.style.height = 'auto';

  addMessage('user', text);
  addTypingIndicator();

  try {
    const response = await fetch(`${APP_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: text,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || '요청 실패');
    }

    removeTypingIndicator();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantText = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(line.slice(6));

          switch (event.type) {
            case 'start':
              if (event.conversation_id) {
                conversationId = event.conversation_id;
              }
              break;
            case 'delta':
              if (!assistantText) {
                assistantText = addMessage('assistant', event.content || '');
              } else {
                assistantText.textContent += event.content || '';
              }
              messagesEl.scrollTop = messagesEl.scrollHeight;
              break;
            case 'error':
              if (!assistantText) {
                assistantText = addMessage('assistant', `오류: ${event.error}`);
              }
              break;
          }
        } catch {
          // 파싱 실패 무시
        }
      }
    }
  } catch (err) {
    removeTypingIndicator();
    addMessage('assistant', `오류: ${err.message}`);
  } finally {
    isLoading = false;
    sendBtn.disabled = !inputEl.value.trim();
  }
}

// 포커스 시 자동으로 입력란에 포커스
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) inputEl.focus();
});

inputEl.focus();
