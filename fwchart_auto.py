"""
FwChart.exe 자동화 스크립트
- FwChart.exe 실행
- 진료실 아이디/비밀번호 로그인
- 닥터인포 실행
- 약품정보 메뉴 진입
"""

import subprocess
import time
import sys
import getpass

import pyautogui
from pywinauto import Application, Desktop

# === 설정 ===
FWCHART_PATH = r"C:\YSR2000\Exe\FwChart.exe"
WAIT_TIMEOUT = 30  # 창 대기 최대 시간(초)

# pyautogui 안전 설정
pyautogui.FAILSAFE = True  # 마우스를 좌상단으로 옮기면 긴급 중단
pyautogui.PAUSE = 0.5       # 각 동작 사이 대기


def wait_for_window(title_re, timeout=WAIT_TIMEOUT):
    """정규식으로 창 제목을 찾아 대기 후 반환"""
    from pywinauto.timings import wait_until_passes
    import re

    def find():
        windows = Desktop(backend="uia").windows()
        for w in windows:
            if re.search(title_re, w.window_text(), re.IGNORECASE):
                return w
        raise Exception(f"'{title_re}' 창을 찾을 수 없음")

    return wait_until_passes(timeout, 1, find)


def main():
    # 1) 로그인 정보 입력
    print("=" * 40)
    print("FwChart 자동화 스크립트")
    print("=" * 40)
    user_id = input("진료실 아이디: ")
    user_pw = getpass.getpass("비밀번호: ")
    print()

    # 2) FwChart.exe 실행
    print("[1/4] FwChart.exe 실행 중...")
    subprocess.Popen(FWCHART_PATH)
    time.sleep(3)  # 프로그램 로딩 대기

    # 3) 로그인 처리
    print("[2/4] 로그인 화면 대기 중...")
    # ──────────────────────────────────────
    # TODO: 스크린샷 확인 후 아래 값을 조정
    # 방법 A) pywinauto 컨트롤 접근 (Win32/UIA)
    # 방법 B) pyautogui 좌표/이미지 매칭
    # ──────────────────────────────────────

    # 방법 B: 좌표 기반 (스크린샷 확인 후 수정)
    # 아이디 입력란 클릭 → 입력
    # pyautogui.click(x=아이디_x, y=아이디_y)
    # pyautogui.typewrite(user_id, interval=0.05)

    # 비밀번호 입력란 클릭 → 입력
    # pyautogui.click(x=비번_x, y=비번_y)
    # pyautogui.typewrite(user_pw, interval=0.05)

    # 로그인 버튼 클릭
    # pyautogui.click(x=로그인_x, y=로그인_y)

    print("  ⚠ 로그인 UI 좌표가 아직 설정되지 않았습니다.")
    print("  ⚠ 스크린샷을 제공해주시면 좌표를 설정하겠습니다.")

    # 4) 닥터인포 실행
    print("[3/4] 닥터인포 실행 대기 중...")
    # TODO: 닥터인포 메뉴/버튼 클릭 로직

    # 5) 약품정보 메뉴 진입
    print("[4/4] 약품정보 메뉴 진입...")
    # TODO: 약품정보 메뉴 클릭 로직

    print("\n✅ 자동화 완료!")


if __name__ == "__main__":
    main()
