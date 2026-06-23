# 오늘, 하나씩

날짜별로 할 일을 입력하고 완료 여부를 체크하는 반응형 웹앱입니다.

Supabase를 연결하기 전에는 브라우저의 로컬 저장소를 사용하므로 바로 체험할 수 있습니다.
Supabase를 연결하면 이메일 로그인, 여러 기기 간 데이터 공유, 실시간 동기화가 활성화됩니다.

요일별 루틴을 설정하면 해당 요일의 체크리스트에 반복 항목이 자동으로 생성됩니다.
루틴 항목의 × 버튼은 반복 설정을 삭제하지 않고 선택한 날짜에서만 제외합니다.

## 로컬 실행

정적 파일 서버로 프로젝트 폴더를 열면 됩니다.

```bash
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`으로 접속하세요.

## Supabase 연결

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase.sql`의 내용을 실행합니다. 기존 프로젝트도 같은 SQL을 다시 실행하면 루틴 테이블이 추가됩니다.
3. Project Settings → API에서 Project URL과 anon public key를 확인합니다.
4. `config.js`에 두 값을 입력합니다.
5. Authentication → URL Configuration의 Site URL을 실제 배포 주소로 설정합니다.

```js
window.APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
};
```

`anon key`는 브라우저에서 사용하는 공개 키입니다. `service_role key`는 절대 넣지 마세요.
사용자별 데이터 접근은 `supabase.sql`의 Row Level Security 정책으로 제한됩니다.

## 배포

정적 웹앱이므로 GitHub Pages, Netlify, Cloudflare Pages, Vercel 등에 폴더 전체를 배포할 수 있습니다.
HTTPS 주소로 배포하면 모바일에서 홈 화면에 추가해 앱처럼 사용할 수도 있습니다.

이 저장소에는 GitHub Pages 자동 배포 워크플로가 포함되어 있습니다.

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더를 저장소의 `main` 브랜치로 푸시합니다.
3. GitHub 저장소의 Settings → Pages → Source에서 `GitHub Actions`를 선택합니다.
4. Actions의 배포가 끝나면 제공되는 HTTPS 주소로 접속합니다.

갤럭시에서는 Chrome 또는 Samsung Internet의 메뉴에서 `앱 설치` 또는
`홈 화면에 추가`를 선택하면 됩니다. 이 설치 방식은 홈 화면 앱 아이콘을 제공하며,
체크리스트 내용을 홈 화면에 직접 표시하는 네이티브 Android 위젯과는 다릅니다.
