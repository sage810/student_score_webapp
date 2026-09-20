# PROJECT_MAP — student score webapp

이 프로젝트에 어떤 파일/폴더가 있고 각각 뭘 하는지만 적는다. 왜 그렇게 만들었는지(판단 이유)는 여기 적지 않는다 — 그건 `.design/decisions.log` 몫이다. 새 파일을 만들거나 지울 때마다 그 즉시 한 줄씩 갱신한다. 나중에 몰아서 정리하지 않는다.

## 구조

```
student score webapp/
├── Code.gs                 서버(Apps Script)
├── appsscript.json         Apps Script 설정
├── index.html              학생 화면
├── teacher.html            교사 화면
├── 수행평가_구글시트_*.xlsx  시트 예시 파일 2개
├── .design/style-lock.md   확정된 디자인 값
└── .claude/                작업 기록 (AGENTS_MAP.md, pending-changes.log)
```

## 파일별 설명

| 경로 | 역할 |
|---|---|
| Code.gs | 구글 시트와 화면 사이를 잇는 Apps Script 서버 코드. 시트 읽기·쓰기와 교사 비밀번호 검증을 맡고, 점수·결시명단은 과목마다 별도 시트로 나눠 저장함 |
| appsscript.json | Apps Script 프로젝트 설정 파일 |
| index.html | 학생용 화면. 학년·반·번호·이름으로 조회하고 결과를 표로 보여줌. 과목이 여러 개면 과목별 카드를 옆으로 넘겨 봄 |
| teacher.html | index.html과 같은 색·글꼴을 쓰지만, 비밀번호 인증 뒤 명단·과목·영역·점수·결시·결시자 수행안내(PDF)를 관리하는 교사용 화면. 저장하지 않은 변경이 있으면 로그아웃·창 닫기 때 경고함 |
| 수행평가_구글시트_데모데이터.xlsx | 구글 드라이브에 올려 구글 시트로 바꿔 쓰는 시트 예시(과목·학생·점수가 채워진 체험용) |
| 수행평가_구글시트_빈템플릿.xlsx | 위 파일과 같은 시트 구성에서 머리글·설정값만 남긴 실사용 시작용 |
| .design/style-lock.md | 확정된 색·글꼴·레이아웃 값 (design-system 스킬이 관리) |
| .claude/AGENTS_MAP.md | 이 프로젝트에서 쓴 스킬 기록 |
| .claude/pending-changes.log | 작업 중 남기는 변경 메모 (정리 후 비움) |
