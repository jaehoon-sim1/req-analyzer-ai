"""
FwChart 로그인 창의 컨트롤 구조를 출력하는 검사 유틸리티.
FwChart.exe가 실행 중인 상태에서 이 스크립트를 실행하세요.
"""

from pywinauto import Desktop
import re


def inspect():
    desktop = Desktop(backend="uia")
    windows = desktop.windows()

    print("=== 열린 창 목록 ===")
    for w in windows:
        title = w.window_text()
        if title:
            print(f"  [{w.element_info.class_name}] \"{title}\"")

    # 의사랑 or 진료실 관련 창 찾기
    print("\n=== 로그인 창 컨트롤 탐색 ===")
    for w in windows:
        title = w.window_text()
        if re.search(r"의사랑|진료실|FwChart|UBcare|로그인", title, re.IGNORECASE):
            print(f"\n▶ 창: \"{title}\"")
            try:
                w.print_control_identifiers(depth=4)
            except Exception as e:
                print(f"  UIA 탐색 실패: {e}")

    # win32 백엔드로도 시도
    print("\n=== win32 백엔드 탐색 ===")
    desktop_win32 = Desktop(backend="win32")
    for w in desktop_win32.windows():
        title = w.window_text()
        if re.search(r"의사랑|진료실|FwChart|UBcare|로그인", title, re.IGNORECASE):
            print(f"\n▶ 창(win32): \"{title}\"")
            try:
                w.print_control_identifiers(depth=4)
            except Exception as e:
                print(f"  win32 탐색 실패: {e}")


if __name__ == "__main__":
    inspect()
