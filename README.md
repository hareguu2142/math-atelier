# 수학의 서재

창의적인 수학 문제를 모으고, KaTeX Markdown으로 문제와 여러 풀이를 작성하는 Next.js 문제은행입니다.

## 기능

- 문제 그리드/리스트 전환과 전체 텍스트 검색
- 문제 상세 및 KaTeX 수식 렌더링
- `풀이 보기`를 눌렀을 때만 열리는 접이식 풀이
- 문제 추가·수정
- 한 문제에 여러 풀이 추가·수정
- PostgreSQL(Neon/Vercel Marketplace) 저장
- `ADMIN_KEY`를 이용한 쓰기 보호
- DB가 없는 로컬 환경에서는 메모리 데이터로 즉시 실행

## 로컬 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. DB를 연결하려면 `.env.example`을 참고해 `.env.local`을 만드세요.

## 데이터 모델

`problems`와 `solutions`는 1:N 관계입니다. 프로덕션 DB에는 StackEdit의 `창의적인 수학문제`, `창의적인 수학문제2`~`7`에서 분리한 80개 문항이 출처 태그와 함께 등록되어 있습니다. 일곱 원본 전문은 `content/`에 보존했습니다.

## 배포

Vercel 프로젝트에 `DATABASE_URL`과 `ADMIN_KEY`를 설정한 후 배포합니다. 읽기는 공개이고 쓰기 작업에만 편집 키가 필요합니다.
