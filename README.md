# 비동기 제어 기반의 시계 & 메모 애플리케이션 과제 🕰

시간 함수인 `setInterval`과 데이터를 보존하는 브라우저 `LocalStorage` 기술을 유기적으로 엮어, 디자인이 가미된 실시간 시계 및 메모 관리 프로그램을 빌드하는 비동기 종합 홈워크 프로젝트입니다.

---

## ?뱛 ?숈뒿 ?뚯씪 援ъ꽦 (Files)

- [index.html](file:///C:/workspace/260529_HW/index.html) : 과제 웹페이지 레이아웃 구조
- [docs/script.js](file:///C:/workspace/260529_HW/docs/script.js) : 페이지 실행 시 LocalStorage로부터 메모를 복원하고 화면 갱신을 주도하는 메인 스크립트
- [docs/clock.js](file:///C:/workspace/260529_HW/docs/clock.js) : 매초 현재 시간을 보기 좋게 포맷팅해 타이틀에 갱신해 주는 비동기 시계 모듈 파일
- [docs/utils.js](file:///C:/workspace/260529_HW/docs/utils.js) : 텍스트 길이 제한 검사나 기타 보조 유틸리티 기능을 모아둔 헬퍼 자바스크립트
- [docs/style.css](file:///C:/workspace/260529_HW/docs/style.css) : 시계와 메모 입력 폼을 조화롭게 꾸미는 다크모드/글라스모피즘 스타일 코드

---

## ?썱 諛곗슫 ?듭떖 媛쒕뀗 (What We Learned)

- **컴포넌트 분리 학습**: 기능을 `clock.js`, `utils.js` 등 여러 스크립트 파일로 쪼개어 하나의 완성형 애플리케이션으로 묶는 소스 코드 모듈화 경험을 쌓습니다.
- **데이터 영속성**: 메모를 추가/삭제했을 때, 새로고침을 해도 데이터가 사라지지 않고 고스란히 남아 있도록 `JSON.stringify`와 `JSON.parse`를 연계한 LocalStorage 입출력을 구현합니다.

---

## ?? ?ㅽ뻾 諛??뺤씤 諛⑸쾿 (How to Run)

1. [docs/index.html](file:///C:/workspace/260529_HW/docs/index.html) 파일을 브라우저로 실행합니다.
2. 상단 시계가 실시간으로 흘러가는지 보고, 메모를 자유롭게 쓴 뒤 지우며 브라우저를 껐다 켜서 보존 상태를 점검합니다.
