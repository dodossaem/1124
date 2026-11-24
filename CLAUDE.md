# 프로젝트 작업 규칙

이 프로젝트는 Vanilla JavaScript를 사용하는 Vite 프로젝트이며, GitHub에 업로드한 후 Netlify와 연동하여 배포합니다.
코드 작업 전에 반드시 아래 규칙을 확인하세요.

## 작업 규칙

1. HTML, CSS, JavaScript 코드는 각각 분리된 파일로 작성한다.
2. `index.html`은 프로젝트 루트에, 애플리케이션의 CSS와 JavaScript 파일은 `src` 폴더에 작성한다. `vite.config.js` 등 설정 파일은 프로젝트 루트에 둔다.
3. JavaScript는 모듈 방식(`<script type="module">`)으로 연결하고, CSS는 JavaScript 진입 파일(`src/main.js`)에서 import하여 Vite 빌드에 포함되도록 한다.
4. 외부 JavaScript 라이브러리는 `npm install`로 설치하고 import하여 사용한다. CDN 방식은 사용하지 않는다.
5. 기존 파일과 설정이 있다면 먼저 확인하고 필요한 부분만 수정한다.

## 페이지 구성

중·고등학생용 사회정서학습 앱 "마음온도". 전체적으로 따뜻한 느낌(크림·피치·머스터드 톤, 둥근 카드)을 유지한다.

| HTML (루트) | JS 진입 파일 | 역할 |
|---|---|---|
| `index.html` | `src/index.js` | 메인 페이지, Google 로그인 관리 |
| `student.html` | `src/main.js` | 학생 활동 (챗봇 대화 3~7턴 → 그림 그리기 → 제출) |
| `teacherMonitor.html` | `src/admin.js` | 교사 모니터링 대시보드 |

- 학생 페이지 모듈: `src/chatConfig.js`(모델명·대화 횟수·프롬프트), `src/openai.js`(OpenAI Responses API 호출, 브라우저 fetch), `src/chatbot.js`(대화 화면), `src/drawing.js`(캔버스), `src/student.css`(학생 페이지 스타일)
- OpenAI API Key는 학생이 화면에서 직접 입력하며 메모리에만 보관한다(서버 함수 사용 안 함).
- 제출 처리는 `src/submission.js`의 `submitActivity()`. 한 학생은 하루(한국 시간) 1개 기록만 가지며 같은 날 다시 제출하면 덮어쓴다.
  - Firestore: `submissions/{uid}_{YYYYMMDD}` (`setDoc`), Storage: `drawings/{uid}/{YYYYMMDD}.png`
  - 필드: `uid`, `name`, `email`, `conversation[{role, content, sentAt}]`, `turnCount`, `chatStartedAt`, `chatEndedAt`, `chatDurationSec`, `drawingStartedAt`, `drawingDurationSec`, `imagePath`, `submittedAt`, `savedAt`
  - 학생은 Storage 읽기 권한이 없으므로 `getDownloadURL`을 쓰지 않는다. 교사 페이지가 `imagePath`로 주소를 가져온다.
  - 필드를 바꾸면 Firestore 보안 규칙의 검증(허용 필드 목록 등)도 함께 바꿔야 한다.
- `student.html`은 로그인하지 않으면 메인 페이지로 돌려보낸다.
- 관리자(교사) UID는 환경 변수 `VITE_ADMIN_UIDS`(쉼표 구분)로 관리하고, 판별은 `src/adminConfig.js`의 `isAdmin(user)`로 한다. 메인 페이지의 '교사 모니터링' 버튼과 `teacherMonitor.html` 접근은 관리자만 가능하다(아니면 메인으로 이동).
- 교사 페이지 모듈: `src/admin.js`(화면·필터), `src/adminData.js`(제출 기록 조회·삭제, 삭제 시 Storage 그림도 함께 삭제), `src/admin.css`. 말풍선 등은 `student.css`를 함께 import해 재사용한다.
- 교사 페이지 구성: 좌측 사이드바(관리자 정보, 날짜 체크박스, `이름 (날짜, 시간)` 목록과 삭제 버튼) | 가운데 대화 | 오른쪽 그림
- 화면 제어는 편의용일 뿐이므로, 데이터 보호는 Firestore/Storage 보안 규칙에도 같은 관리자 UID를 넣어 처리한다.
- Firebase는 npm `firebase` 패키지를 사용한다. 초기화는 `src/firebaseConfig.js`에서만 하고(`app`, `auth`, `googleProvider`, `db`, `storage` export), 다른 파일은 이를 import한다.
- Firebase 설정값은 환경 변수(`VITE_FIREBASE_*`)로 관리한다. 로컬은 `.env.local`(Git 제외), 예시는 `.env.example`, 배포는 Netlify 환경 변수에 등록한다.
- 공통 스타일은 `src/styles.css`, 색상은 `:root` CSS 변수로 관리한다.
- 폰트는 npm의 `@fontsource/gowun-dodum`(본문), `@fontsource/jua`(제목)를 사용한다.
- HTML 페이지를 추가하면 `vite.config.js`의 `build.rolldownOptions.input`에도 등록한다.

## 빌드 및 배포

- 개발 서버: `npm run dev`
- 빌드: `npm run build` (출력 폴더: `dist`)
- Netlify 설정
  - Build command: `npm run build`
  - Publish directory: `dist`
