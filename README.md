# Age of Godir — 신들의 시대

에이지 오브 원더 4 스타일의 브라우저 4X 판타지 전략 게임입니다. 외부 라이브러리·이미지·음원 파일 없이, 모든 그래픽은 Canvas 코드로, 배경음악(클래식 27곡)과 효과음은 Web Audio 신디사이저로 직접 만들었습니다.

## 실행 방법

### 1. 가장 쉬운 방법: 파일 하나로 실행
1. GitHub에서 `dist/index.html`을 엽니다 → 오른쪽 위 **Download raw file**(↓ 아이콘)로 내려받습니다.
2. 내려받은 `index.html`을 더블클릭합니다. Chrome, Edge, Firefox에서 인터넷 연결 없이 실행됩니다.
3. 화면을 한 번 클릭하면 음악이 시작됩니다(브라우저 자동재생 정책).

### 2. 저장소 전체를 받아서 실행
```bash
git clone https://github.com/finemold2/agelike.git
cd agelike
git checkout claude/age-of-wonders-game-g3b5hc   # PR이 main에 병합된 뒤에는 생략
```
- `index.html`을 더블클릭하면 개발용 버전이 실행됩니다(파일 여러 개를 그대로 불러옴).
- `dist/index.html`은 모든 파일을 하나로 합친 배포용 버전입니다.
- 로컬 서버로 열고 싶으면: `npx serve .` 또는 `python3 -m http.server 8000` → `http://localhost:8000/`

### 3. GitHub Pages로 공개 URL 만들기
1. 저장소 → **Settings** → 왼쪽 메뉴 **Pages**.
2. **Build and deployment** → Source: **Deploy from a branch**.
3. Branch: `claude/age-of-wonders-game-g3b5hc`(또는 병합 후 `main`), Folder: **/ (root)** → **Save**.
4. 1–2분 뒤 `https://finemold2.github.io/agelike/` 에서 실행됩니다. 단일 파일 버전은 `https://finemold2.github.io/agelike/dist/index.html` 입니다.
5. 비공개(private) 저장소는 무료 요금제에서 Pages를 쓸 수 없습니다. 이 경우 Settings → General 맨 아래 **Change repository visibility**로 공개로 바꾸거나, 1번 방법을 쓰세요.

## 조작법
- 새 게임 → 영역 설정 → 세력 생성 6단계(지배자·종족·문화·사회 특성·시작 서·색상) → 완료.
- 지도에서 부대를 클릭해 선택하고, 목적지를 두 번 클릭하면 이동합니다. 적과 마주치면 공격/자동 전투를 고릅니다.
- 도시를 클릭해 건설·모집·지방 합병을 하고, 상단 버튼으로 연구·주문서·영웅·제국·외교 화면을 엽니다.
- `Enter` 턴 종료 · `F5` 빠른 저장 · `F9` 불러오기 · `N` 다음 부대 · `C` 수도로 이동 · `M` 음소거 · 설정에서 언어(한국어/English)와 볼륨 조절.

## 개발
```bash
node tools/build.js          # dist/index.html, dist/artifact.html 생성
node tools/check.js          # 데이터 교차 참조 검증
node tools/playtest.js --turns 30 --players 4   # AI 자동 플레이(헤드리스)
node tools/e2e.js            # 사람 조작 흐름 44단계 자동 테스트(Playwright)
```
아트 갤러리: `demo.html?module=terrain|structures|units|vfx|icons|combat|world`

## 구조
- `docs/SPEC.md` 아키텍처 명세, `docs/research/` 원작 조사 문서
- `src/core` 헥스·난수·노이즈·데이터 레지스트리·i18n · `src/art` 절차적 아트 · `src/data` 콘텐츠 · `src/game` 상태·세계 생성·규칙·턴·전투·외교·AI · `src/render` 렌더러 · `src/audio` 신디사이저·음악·효과음·악보 · `src/ui` 화면
