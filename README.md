# EconoDash

[대시보드 열기](https://seungbiny.github.io/econodash/) · [GitHub 저장소](https://github.com/seungbiny/econodash)

한국어 경제 대시보드. 주식, 10년물 국채 수익률, 상품 선물, 환율, 가상자산 22개를 현재 시세 및 직전·1주·1개월 비교로 확인합니다.

화면은 GitHub Pages에 배포합니다. 페이지를 열거나 **전체 재조회**를 누르면 기존 시세 서버를 호출합니다. GitHub Pages는 정적 파일을 제공하므로 시세 조회 서버가 별도로 필요합니다. 현재 서버 주소는 `index.html`의 `econodash-api-endpoint` 메타 태그에 설정합니다.

한국·일본 10년물은 네이버 증권의 시장 수익률과 같은 출처의 일별 이력을 사용합니다. 일본은 출처 기준 2시간 지연을 표시합니다. 조회 실패 시 마지막 확인값을 유지합니다. 서버 API 키를 프런트엔드에 넣지 않습니다.

## 파일

- `index.html`, `app.js`, `styles.css`: 화면과 사용자 기능
- `refresh-state.js`: 조회 응답 검증과 마지막 성공값 저장
- `lib/market-data.mjs`: 시장별 시세 조회와 비교 계산
- `lib/refresh-api.mjs`, `server/worker.mjs`: 독립적으로 사용할 수 있는 조회 서버 코드
- `.github/workflows/pages.yml`: `main` 변경 시 테스트 후 Pages 자동 배포

## 실행

Node.js 22 이상에서 추가 패키지 설치 없이 실행할 수 있습니다.

```sh
npm test
npm run build
npm run dev
```

GitHub 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 설정합니다. 기존 시세 서버에서는 이 계정의 Pages 출처(`https://seungbiny.github.io`)를 허용합니다. 독립 Worker를 사용하는 경우 `ALLOWED_ORIGINS`에 정확한 Pages 출처를 설정하고 프런트엔드의 서버 주소를 변경합니다.

원본 Sites 체크아웃에서 화면을 다시 가져오려면 `node scripts/export-from-sites.mjs <체크아웃 경로>`를 실행합니다. 호스팅 메타데이터, 자격 증명, 로컬 실행 상태 및 기존 Git 이력은 내보내지 않습니다.
