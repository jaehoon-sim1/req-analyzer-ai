// 확장 프로그램 아이콘 클릭 또는 단축키(Ctrl+Alt+Space) 시 사이드패널 열기
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 사이드패널 동작 설정
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);
