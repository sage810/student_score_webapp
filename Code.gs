/**
 * 수행평가 조회/관리 웹앱 — Google Sheets 기반 백엔드
 *
 * 한 명의 교사가 한 학기에 여러 과목(최대 5개)을 맡을 수 있다는 전제로,
 * 영역·점수는 과목별로, 학생 명단은 과목과 상관없이 학급(학년·반)별로 관리한다.
 * 어떤 과목에 어떤 학급이 속하는지는 "과목" 시트의 학년반목록이 정하고, 그 학급의 학생이 자동으로 그 과목의 화면에 연결된다.
 *
 * 시트 구성 (없으면 ensureSheets_ 가 자동 생성 + 데모 데이터 채움):
 *   설정  : A열 키 / B열 값  (연도, 학기, 비밀번호, 1학년반수, 2학년반수, 3학년반수)
 *          "비밀번호"는 교사 관리 화면(?page=teacher) 접속 시 입력해야 하는 값 — 시트에서 직접 바꾸면 됨
 *          "N학년반수"는 그 학년의 반이 몇 반까지 있는지(매년 바뀔 수 있음) — 시트에서 숫자만 바꾸면 반영됨
 *   과목  : 과목명 | 총점 | 학년반목록 | ID  (2행부터, 최대 5개 과목. "총점"은 영역 배점 합과 별개로 선언하는 만점 — 100점이 아닐 수도 있음.
 *          "학년반목록"은 이 과목을 반 전체가 듣는 학년-반 조합을 "학년-반" 형식으로 세미콜론(;)으로 이어붙인 문자열. 예: "1-1;1-2;2-3"
 *          "ID"는 화면에 안 보이는 내부 식별자 — 같은 이름의 과목을 학년별로 여러 개 만들어도(예: "기술·가정"을 1학년용/2학년용 각각) 영역이 안 섞이게 해줌)
 *   출석명단_과목명 : 학년 | 반 | 번호 | 이름  — 반 전체가 아니라 학생 한 명씩 그 과목을 듣는 개별수강생 (과목명마다 별도 시트.
 *          수업 과목 설정의 "이 과목을 수강하는 학생 추가하기"로 학생을 추가하면 자동으로 만들어짐. 시트에서 직접 행을 더하거나 지워도 됨 — 학년·반·번호로 판단하고 이름은 확인용)
 *          → 이 과목의 학급 = 학년반목록 + 출석명단 학생의 학급. 출석명단으로만 들어간 학급에서는 그 학생들만 이 과목 화면에 나옴
 *          (이름이 같은 과목이 학년별로 여럿이면 학생의 학년을 듣는 쪽 과목에 붙음)
 *   영역메모 : 과목ID | 학년 | 반 | 영역명 | 메모  — 응시·결시 관리의 "영역별 메모"(반마다 따로). 영역 상태는 여기에 없고 "영역" 시트의 "상태" 열에서 관리함
 *          (예전 이름은 "진행상태" — 그 이름의 시트가 있으면 처음 열 때 "영역메모"로 이름만 바뀌고 메모는 그대로 남음)
 *   영역  : 과목ID | 영역명 | 배점 | 그룹 | 상태  (그룹이 같으면 화면에서 한 묶음으로 표시. "과목명"이 아니라 "과목ID" 기준이라 이름이 같은 과목끼리도 안 섞임)
 *          "상태" = "완료" / "이번 수행" / "예정" (시트에서 드롭다운으로 고름, 비어 있으면 "예정"). 그 과목을 듣는 모든 반에 같은 상태가 적용됨.
 *          수행 영역 관리 화면에서 바꿔도, 시트에서 직접 바꿔도 같은 값을 쓰고, 학생 조회 화면의 "이번 수행"도 이 값을 따름
 *   명단  : 학년 | 반 | 번호 | 이름  — 학급별 학생 (과목 열 없음). 수업 과목 설정에서 그 학년·반을 추가한 과목의 응시·결시 관리, 반별 점수 입력 표, 결시자 수행안내에 자동 연결됨 (교사 화면의 "학생 명단 관리"에서도 편집 가능)
 *   점수_과목명 : 과목명 | 학년 | 반 | 번호 | 이름 | <영역1> | <영역2> | ... | 합계  ("합계"는 맨 오른쪽 열, 영역 점수의 SUM 수식 — 결시·빈 칸은 합에서 빠짐. 영역이 추가되어도 합계 열 앞에 끼워져 항상 맨 오른쪽에 있음. 영역 이름을 "합계"로 짓지 말 것)  (과목명이 다르면 시트도 다름 — 예: "점수_기술·가정". 없으면 처음 저장할 때 자동으로 만들어지고, 예전 통합 "점수" 시트에 그 과목 기록이 있으면 자동으로 옮겨 옴. 시트 이름에 못 쓰는 글자 : \ / ? * [ ] 는 _ 로 바뀜. 빈 칸 = 미실시, "결시" = 응시·결시 관리에서 결시로 표시한 항목 — 총점 계산은 미실시와 동일하게 취급. 예전에 저장된 "결시:날짜" 형식도 결시로 인식하며, 저장하면 "결시"로 정리됨)
 *   (점수_과목명·결시명단_과목명 시트는 저장할 때마다 학년 → 반 → 번호 오름차순으로 정렬됨. 반·번호는 숫자로 비교해서 2반이 10반보다 앞)
 *   결시명단_과목명 : 영역 | 학년 | 반 | 번호 | 이름  — 그 과목에서 결시로 체크된 학생 목록 (과목마다 별도 시트. 응시·결시 관리에서 저장할 때마다 그 반·그 영역들 범위 안에서 다시 채워짐)
 */

var MAX_SUBJECTS = 5;
var ABSENT_MARKER = '결시';

function isAbsentValue_(raw) {
  return raw === ABSENT_MARKER || String(raw).indexOf(ABSENT_MARKER + ':') === 0;
}

function doGet(e) {
  var page = e && e.parameter && e.parameter.page;
  var file = page === 'teacher' ? 'teacher' : 'index';
  var title = page === 'teacher' ? '수행평가 관리' : '수행평가 조회';
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 배포 주소를 알려줌 — 학생 화면의 "교사 관리" 탭은 <배포 주소>?page=teacher 로, 교사 비밀번호 화면의 "← 이전"은 <배포 주소>(학생 화면)로 이동
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var DEMO_SUBJECT = '기술·가정';
  var DEMO_SUBJECT_ID = 'demo-subject-1';

  var cfg = ss.getSheetByName('설정');
  if (!cfg) {
    cfg = ss.insertSheet('설정');
    cfg.getRange('A1:B6').setValues([
      ['연도', 2025],
      ['학기', '2학기'],
      ['비밀번호', '1234'],
      ['1학년반수', 4],
      ['2학년반수', 4],
      ['3학년반수', 4]
    ]);
  }

  var subj = ss.getSheetByName('과목');
  var seedDemoScores = false;
  var legacyCurrent = [];
  if (!subj) {
    seedDemoScores = true;
    subj = ss.insertSheet('과목');
    subj.getRange('A1:D1').setValues([SUBJECT_HEADER]);
    subj.getRange('A2:D2').setValues([[DEMO_SUBJECT, 100, '1-1;1-2;2-1;2-2', DEMO_SUBJECT_ID]]);
  } else if (String(subj.getRange(1, 2).getValue()) === '현재영역') {
    // 예전 형식(과목명 | 현재영역 | 총점 | 학년반목록 | ID)에서 "현재영역" 열을 없앤다. 이번 수행 표시는 "영역" 시트의 상태로 대신한다.
    // 없애기 전에 적혀 있던 현재영역은 아래에서 그 영역의 상태("이번 수행")로 옮겨 둔다.
    var oldRows = subj.getLastRow() > 1 ? subj.getRange(2, 1, subj.getLastRow() - 1, 5).getValues() : [];
    legacyCurrent = oldRows
      .filter(function (r) { return r[0] && r[1] && r[4]; })
      .map(function (r) { return { id: String(r[4]), domain: String(r[1]), pairs: parseClassPairs_(r[3]) }; });
    subj.deleteColumn(2);
  }

  var dom = ss.getSheetByName('영역');
  if (!dom) {
    dom = ss.insertSheet('영역');
    dom.getRange('A1:E1').setValues([DOMAIN_HEADER]);
    // 데모: 앞의 두 영역은 완료, 에코 수세미 제작하기는 이번 수행
    dom.getRange('A2:E7').setValues([
      [DEMO_SUBJECT_ID, '청소년의 건강한 식생활 제안하기', 20, '', '완료'],
      [DEMO_SUBJECT_ID, '나에게 어울리는 옷 디자인하기', 16, '의복 디자인하기', '완료'],
      [DEMO_SUBJECT_ID, '에코 수세미 제작하기', 14, '의복 디자인하기', '이번 수행'],
      [DEMO_SUBJECT_ID, '적정기술의 필요성 주장하기', 20, '', '예정'],
      [DEMO_SUBJECT_ID, '발명품 계획하기', 14, '기술적 문제 해결 및 발명품 기획 프로젝트', '예정'],
      [DEMO_SUBJECT_ID, '발명품 제작하기', 16, '기술적 문제 해결 및 발명품 기획 프로젝트', '예정']
    ]);
    applyDomainStatusValidation_(dom);
  } else {
    migrateDomainStatus_(ss, dom);
  }

  var roster = ss.getSheetByName('명단');
  if (!roster) {
    roster = ss.insertSheet('명단');
    roster.getRange('A1:D1').setValues([['학년', '반', '번호', '이름']]);
    var names = ['홍길동', '김민준', '이서연', '박도윤', '최지우', '정하은', '강서준', '윤지호',
      '임수아', '한동현', '오예은', '신재훈', '조은우', '배시우', '문가은', '유단비'];
    var rows = [];
    var idx = 0;
    for (var g = 1; g <= 2; g++) {
      for (var c = 1; c <= 2; c++) {
        for (var n = 1; n <= 4; n++) {
          rows.push([g, c, n, names[idx++]]);
        }
      }
    }
    roster.getRange(2, 1, rows.length, 4).setValues(rows);
  } else {
    migrateRosterIfNeeded_(roster);
  }

  // 한때 과목 시트 E열("개별수강생")에 "학년-반-번호;..."로 적던 개별수강생을 "출석명단_과목명" 시트로 옮기고 그 열은 없앤다
  if (subj.getMaxColumns() >= 5 && String(subj.getRange(1, 5).getValue()) === '개별수강생') {
    var rosterRows = roster.getLastRow() > 1 ? roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues() : [];
    var enrollByName = {};
    if (subj.getLastRow() > 1) {
      subj.getRange(2, 1, subj.getLastRow() - 1, 5).getValues().forEach(function (r) {
        if (r[0]) enrollByName[r[0]] = (enrollByName[r[0]] || []).concat(parseStudentList_(r[4]));
      });
    }
    Object.keys(enrollByName).forEach(function (name) { writeEnrollSheet_(ss, name, enrollByName[name], rosterRows); });
    subj.deleteColumn(5);
  }

  // 점수는 과목마다 별도 시트("점수_과목명")에 저장한다. 데모 과목의 점수 시트는 처음 만들 때만 채운다.
  if (seedDemoScores && !ss.getSheetByName(subjectSheetName_('점수', DEMO_SUBJECT)) && roster.getLastRow() > 1) {
    var score = ss.insertSheet(subjectSheetName_('점수', DEMO_SUBJECT));
    var demoDomains = getDomainsForSubject_(ss, DEMO_SUBJECT_ID);
    var header = SCORE_FIXED_HEADER.concat(demoDomains.map(function (d) { return d.name; }), [TOTAL_HEADER]);
    score.getRange(1, 1, 1, header.length).setValues([header]);

    // 데모용 상태: 2=에코 수세미(이번 수행, 전원 미채점) / 3=적정기술(절반만 미실시) / 4,5=발명품(전원 예정)
    var rosterData = roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues();
    var scoreRows = rosterData.map(function (r, i) {
      var vals = demoDomains.map(function (d, di) {
        if (di === 2 || di === 4 || di === 5) return '';
        if (di === 3 && i % 2 === 1) return '';
        return Math.round(d.max * (0.7 + Math.random() * 0.3)); // 만점의 70~100%
      });
      return [DEMO_SUBJECT].concat(r, vals, ['']);
    });
    score.getRange(2, 1, scoreRows.length, header.length).setValues(scoreRows);
    refreshTotalColumn_(score);
  }

  // 영역별 메모 시트 "영역메모". 예전 이름("진행상태")의 시트가 있으면 이름만 바꿔서 메모를 그대로 쓴다.
  var memo = ss.getSheetByName(MEMO_SHEET);
  var legacyMemo = ss.getSheetByName(LEGACY_MEMO_SHEET);
  if (!memo && legacyMemo) {
    legacyMemo.setName(MEMO_SHEET);
    memo = legacyMemo;
  }
  if (!memo) {
    memo = ss.insertSheet(MEMO_SHEET);
    memo.getRange('A1:E1').setValues([MEMO_HEADER]);
  } else {
    // 예전 형식(과목ID | 학년 | 반 | 영역명 | 상태 [| 메모])의 반별 상태 열을 없앤다. 상태는 위의 migrateDomainStatus_ 가 이미 "영역" 시트로 옮겼다.
    // 상태만 있고 메모가 없던 행은 더 이상 필요 없으므로 함께 지운다.
    if (String(memo.getRange(1, 5).getValue()) === '상태') {
      memo.deleteColumn(5);
      var pLast = memo.getLastRow();
      var memoRows = pLast > 1 ? memo.getRange(2, 1, pLast - 1, 5).getValues().filter(function (r) { return String(r[4]).trim(); }) : [];
      memo.clear();
      memo.getRange(1, 1, 1, 5).setValues([MEMO_HEADER]);
      if (memoRows.length) memo.getRange(2, 1, memoRows.length, 5).setValues(memoRows);
    }
    if (String(memo.getRange(1, 5).getValue()) !== '메모') memo.getRange(1, 5).setValue('메모');
  }

  if (legacyCurrent.length) {
    // 아주 예전 형식의 "현재영역"은 그 영역의 상태를 "이번 수행"으로 바꿔서 옮긴다(이미 완료·이번 수행이면 그대로 둠).
    var domLast = dom.getLastRow();
    var domRows = domLast > 1 ? dom.getRange(2, 1, domLast - 1, 5).getValues() : [];
    domRows.forEach(function (r, i) {
      var hit = legacyCurrent.some(function (s) { return s.id === String(r[0]) && s.domain === String(r[1]); });
      if (hit && (r[4] === '' || r[4] === '예정')) dom.getRange(i + 2, 5).setValue('이번 수행');
    });
  }

  return ss;
}

var SUBJECT_HEADER = ['과목명', '총점', '학년반목록', 'ID'];
var ENROLL_PREFIX = '출석명단';
var ENROLL_HEADER = ['학년', '반', '번호', '이름'];
var DOMAIN_STATUSES = ['완료', '이번 수행', '예정'];
var DOMAIN_HEADER = ['과목ID', '영역명', '배점', '그룹', '상태'];
var MEMO_SHEET = '영역메모';
var LEGACY_MEMO_SHEET = '진행상태'; // 영역메모 시트의 예전 이름 (반별 상태도 함께 들어 있던 시절)
var MEMO_HEADER = ['과목ID', '학년', '반', '영역명', '메모'];

// "영역" 시트 상태 열(E열)에 완료/이번 수행/예정 드롭다운을 건다. 시트에서 직접 고칠 때도 이 세 값만 들어가게 한다.
function applyDomainStatusValidation_(dom) {
  if (dom.getMaxRows() < 2) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(DOMAIN_STATUSES, true).setAllowInvalid(false).build();
  dom.getRange(2, 5, dom.getMaxRows() - 1, 1).setDataValidation(rule);
}

// 예전에는 영역 상태가 "진행상태"(지금의 영역메모) 시트에 반마다 있었다(과목ID | 학년 | 반 | 영역명 | 상태 | 메모).
// 이제는 "영역" 시트의 "상태" 열 하나로 관리하므로, 그 열이 없으면 만들고 예전 값을 옮겨 온다.
// 반마다 상태가 같았으면 그 값, 서로 달랐으면 "이번 수행", 기록이 없던 영역은 "예정"으로 옮긴다.
// (그 시트의 상태 열 삭제와 "영역메모"로 이름 바꾸기는 이어서 ensureSheets_ 가 한다)
function migrateDomainStatus_(ss, dom) {
  if (dom.getMaxColumns() < 5) dom.insertColumnsAfter(dom.getMaxColumns(), 5 - dom.getMaxColumns());
  if (String(dom.getRange(1, 5).getValue()) === '상태') return;

  var perDomain = {}; // "과목ID|영역명" -> [반마다의 상태]
  var progress = ss.getSheetByName(MEMO_SHEET) || ss.getSheetByName(LEGACY_MEMO_SHEET);
  if (progress && String(progress.getRange(1, 5).getValue()) === '상태' && progress.getLastRow() > 1) {
    progress.getRange(2, 1, progress.getLastRow() - 1, 5).getValues().forEach(function (r) {
      if (!r[0] || !r[3] || DOMAIN_STATUSES.indexOf(String(r[4])) === -1) return;
      var key = r[0] + '|' + r[3];
      (perDomain[key] = perDomain[key] || []).push(String(r[4]));
    });
  }

  dom.getRange(1, 5).setValue('상태');
  var lastRow = dom.getLastRow();
  if (lastRow > 1) {
    var keys = dom.getRange(2, 1, lastRow - 1, 2).getValues();
    dom.getRange(2, 5, keys.length, 1).setValues(keys.map(function (r) {
      var list = perDomain[r[0] + '|' + r[1]] || [];
      if (!list.length) return ['예정'];
      return [list.every(function (s) { return s === list[0]; }) ? list[0] : '이번 수행'];
    }));
  }
  applyDomainStatusValidation_(dom);
}

// 예전 형식(과목명 | 학년 | 반 | 번호 | 이름)의 명단 시트를 새 형식(학년 | 반 | 번호 | 이름)으로 바꾼다.
// 같은 학생이 과목별로 여러 줄 있었으면 한 줄로 합친다.
function migrateRosterIfNeeded_(roster) {
  if (String(roster.getRange(1, 1).getValue()) !== '과목명') return;
  var lastRow = roster.getLastRow();
  var old = lastRow > 1 ? roster.getRange(2, 1, lastRow - 1, 5).getValues() : [];
  var seen = {};
  var rows = [];
  old.forEach(function (r) {
    var key = r[1] + '|' + r[2] + '|' + r[3];
    if (seen[key] || r[1] === '' || r[3] === '') return;
    seen[key] = true;
    rows.push([r[1], r[2], r[3], r[4]]);
  });
  roster.clear();
  roster.getRange(1, 1, 1, 4).setValues([['학년', '반', '번호', '이름']]);
  if (rows.length) roster.getRange(2, 1, rows.length, 4).setValues(rows);
}

function getCfgMap_(ss) {
  var cfgSheet = ss.getSheetByName('설정');
  var vals = cfgSheet.getRange(1, 1, cfgSheet.getLastRow(), 2).getValues();
  var cfg = {};
  vals.forEach(function (row) { cfg[row[0]] = row[1]; });
  return cfg;
}

function getClassCounts_(cfg) {
  return {
    1: Number(cfg['1학년반수']) || 4,
    2: Number(cfg['2학년반수']) || 4,
    3: Number(cfg['3학년반수']) || 4
  };
}

function parseClassPairs_(str) {
  return String(str || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (pair) {
    var parts = pair.split('-');
    return { grade: parts[0], cls: parts[1] };
  });
}

function serializeClassPairs_(pairs) {
  return (pairs || []).map(function (p) { return p.grade + '-' + p.cls; }).join(';');
}

// 예전 과목 시트 "개별수강생" 칸: "학년-반-번호;학년-반-번호" → [{grade, cls, number}] (출석명단 시트로 옮길 때만 씀)
function parseStudentList_(str) {
  return String(str || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (item) {
    var parts = item.split('-');
    return { grade: parts[0], cls: parts[1], number: parts[2] };
  }).filter(function (s) { return s.grade && s.cls && s.number; });
}

// "출석명단_과목명" 시트의 개별수강생 → [{grade, cls, number}] (시트가 없으면 없음)
function readEnrollSheet_(ss, subject) {
  var sheet = ss.getSheetByName(subjectSheetName_(ENROLL_PREFIX, subject));
  if (!sheet || sheet.getLastRow() < 2) return [];
  var seen = {}, list = [];
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues().forEach(function (r) {
    if (r[0] === '' || r[1] === '' || r[2] === '') return;
    var key = r[0] + '-' + r[1] + '-' + r[2];
    if (seen[key]) return;
    seen[key] = true;
    list.push({ grade: String(r[0]), cls: String(r[1]), number: String(r[2]) });
  });
  return list;
}

// 개별수강생을 "출석명단_과목명" 시트에 다시 쓴다. 이름은 명단에서 찾아 채운다.
// 학생이 없으면 시트를 새로 만들지 않고, 이미 있던 시트는 머리글만 남긴다.
function writeEnrollSheet_(ss, subject, students, rosterRows) {
  var name = subjectSheetName_(ENROLL_PREFIX, subject);
  var sheet = ss.getSheetByName(name);
  if (!sheet && !students.length) return;
  if (!sheet) sheet = ss.insertSheet(name);
  var nameOf = {};
  rosterRows.forEach(function (r) { nameOf[r[0] + '-' + r[1] + '-' + r[2]] = r[3]; });
  var seen = {}, rows = [];
  students.forEach(function (s) {
    var key = s.grade + '-' + s.cls + '-' + s.number;
    if (seen[key]) return;
    seen[key] = true;
    rows.push([s.grade, s.cls, s.number, nameOf[key] || '']);
  });
  rows = sortByClassOrder_(rows, 0, 1, 2);
  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([ENROLL_HEADER]);
  if (rows.length) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}

function getSubjects_(ss) {
  var sheet = ss.getSheetByName('과목');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var subjects = sheet.getRange(2, 1, lastRow - 1, 4).getValues()
    .filter(function (r) { return r[0]; })
    .map(function (r) {
      return {
        name: String(r[0]), declaredTotal: Number(r[1]) || 0,
        classPairs: parseClassPairs_(r[2]), id: String(r[3] || ''), students: []
      };
    });
  // 개별수강생은 과목명마다 "출석명단_과목명" 시트에서. 이름이 같은 과목이 여럿이면 그 학생의 학년을 듣는 쪽에 붙인다.
  var done = {};
  subjects.forEach(function (s) {
    if (done[s.name]) return;
    done[s.name] = true;
    var same = subjects.filter(function (t) { return t.name === s.name; });
    readEnrollSheet_(ss, s.name).forEach(function (st) {
      var target = same.filter(function (t) {
        return t.classPairs.some(function (p) { return String(p.grade) === st.grade; });
      })[0] || same[0];
      target.students.push(st);
    });
  });
  return subjects;
}

// 이 과목이 나오는 학급: 반 전체가 듣는 학급(학년반목록) + 개별수강생이 속한 학급
function subjectClasses_(s) {
  var seen = {}, list = [];
  s.classPairs.concat(s.students).forEach(function (p) {
    var key = p.grade + '-' + p.cls;
    if (seen[key]) return;
    seen[key] = true;
    list.push({ grade: p.grade, cls: p.cls });
  });
  return list;
}

// 그 학급에서 이 과목을 듣는 번호 목록. 반 전체가 들으면 null(모두).
function enrolledNumbers_(s, grade, cls) {
  var whole = s.classPairs.some(function (p) { return String(p.grade) === String(grade) && String(p.cls) === String(cls); });
  if (whole) return null;
  return s.students
    .filter(function (p) { return String(p.grade) === String(grade) && String(p.cls) === String(cls); })
    .map(function (p) { return String(p.number); });
}

function isEnrolled_(s, grade, cls, number) {
  var nums = enrolledNumbers_(s, grade, cls);
  return nums === null || nums.indexOf(String(number)) !== -1;
}

// 이름이 같은 과목이 여러 개 있을 수 있으므로, 이름만으로는 어떤 과목인지 확정할 수 없다.
// 후보가 여럿이면 학년·반이 그 과목의 학급(개별수강생 학급 포함)에 들어가는 쪽을 고른다.
function resolveSubjectInstance_(subjects, name, grade, cls) {
  var candidates = subjects.filter(function (s) { return s.name === name; });
  if (candidates.length <= 1) return candidates[0] || null;
  var matched = candidates.filter(function (s) {
    return subjectClasses_(s).some(function (p) { return String(p.grade) === String(grade) && String(p.cls) === String(cls); });
  });
  return matched[0] || candidates[0];
}

function getDomainsForSubject_(ss, subjectId) {
  var domSheet = ss.getSheetByName('영역');
  var lastRow = domSheet.getLastRow();
  if (lastRow < 2) return [];
  return domSheet.getRange(2, 1, lastRow - 1, 5).getValues()
    .filter(function (r) { return r[0] === subjectId && r[1]; })
    .map(function (r) {
      return {
        name: String(r[1]), max: Number(r[2]) || 0, group: String(r[3] || ''),
        status: DOMAIN_STATUSES.indexOf(String(r[4])) !== -1 ? String(r[4]) : '예정' // 비어 있으면 예정
      };
    });
}

/* ---------- 과목별 시트 (과목명이 다르면 점수·결시명단이 서로 다른 시트에 저장된다) ---------- */

// 학년 → 반 → 번호 순으로 오름차순 정렬한다 (숫자로 비교하므로 2반이 10반보다 앞). 점수·결시명단 시트를 쓸 때마다 적용한다.
function sortByClassOrder_(rows, gradeIdx, clsIdx, numIdx) {
  function cmp(a, b) {
    var na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a) < String(b) ? -1 : (String(a) > String(b) ? 1 : 0);
  }
  return rows.slice().sort(function (x, y) {
    return cmp(x[gradeIdx], y[gradeIdx]) || cmp(x[clsIdx], y[clsIdx]) || cmp(x[numIdx], y[numIdx]);
  });
}

var SCORE_FIXED_HEADER = ['과목명', '학년', '반', '번호', '이름'];
var ABSENT_HEADER = ['영역', '학년', '반', '번호', '이름'];
var TOTAL_HEADER = '합계';

// 점수 시트 맨 오른쪽의 "합계" 열. 없으면 만든다 (예전에 만든 시트도 다음 저장 때 생김).
function ensureTotalColumn_(sheet) {
  var lastCol = sheet.getLastColumn();
  var header = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (header.indexOf(TOTAL_HEADER) === -1) sheet.getRange(1, lastCol + 1).setValue(TOTAL_HEADER);
}

// 합계 = 영역 열(F열~합계 바로 앞 열)의 SUM. "결시"·빈 칸은 글자/빈 칸이라 합에서 빠진다.
// 행을 통째로 다시 쓰면 수식이 값으로 바뀌므로, 점수 시트를 쓴 뒤에는 항상 이 함수로 수식을 다시 채운다.
function refreshTotalColumn_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var ti = header.indexOf(TOTAL_HEADER);
  var rows = sheet.getLastRow() - 1;
  if (ti < 0 || rows < 1) return;
  var formula = ti > SCORE_FIXED_HEADER.length ? '=SUM(RC' + (SCORE_FIXED_HEADER.length + 1) + ':RC' + ti + ')' : '=0';
  sheet.getRange(2, ti + 1, rows, 1).setFormulaR1C1(formula);
}

// 시트 이름에 못 쓰는 글자(: \ / ? * [ ])는 _ 로 바꾸고, 100자를 넘지 않게 자른다.
function subjectSheetName_(prefix, subject) {
  return (prefix + '_' + String(subject).replace(/[:\\\/\?\*\[\]]/g, '_').trim()).slice(0, 100);
}

function domainNamesOfSubjectName_(ss, subject) {
  var names = [];
  getSubjects_(ss).filter(function (s) { return s.name === subject; }).forEach(function (s) {
    getDomainsForSubject_(ss, s.id).forEach(function (d) { if (names.indexOf(d.name) === -1) names.push(d.name); });
  });
  return names;
}

// 그 과목의 점수 시트("점수_과목명"). 없으면 null, createIfMissing 이면 새로 만든다.
// 예전 통합 "점수" 시트에 그 과목의 기록이 있으면 그 과목 것만 새 시트로 옮겨 온다 (통합 시트는 그대로 남는다).
function getScoreSheet_(ss, subject, createIfMissing) {
  var sheet = ss.getSheetByName(subjectSheetName_('점수', subject));
  if (sheet) return sheet;

  var legacy = ss.getSheetByName('점수');
  var legacyHeader = [];
  var legacyRows = [];
  if (legacy && legacy.getLastRow() > 0) {
    var values = legacy.getDataRange().getValues();
    legacyHeader = values.shift() || [];
    legacyRows = values.filter(function (r) { return String(r[0]) === subject; });
  }
  if (!createIfMissing && legacyRows.length === 0) return null;

  sheet = ss.insertSheet(subjectSheetName_('점수', subject));
  var header = SCORE_FIXED_HEADER.slice();
  var rows = [];
  if (legacyRows.length) {
    var domainNames = domainNamesOfSubjectName_(ss, subject);
    var keep = [];
    for (var i = 5; i < legacyHeader.length; i++) {
      var used = domainNames.indexOf(legacyHeader[i]) !== -1 ||
        legacyRows.some(function (r) { return r[i] !== '' && r[i] !== null && r[i] !== undefined; });
      if (used) keep.push(i);
    }
    keep.forEach(function (i) { header.push(legacyHeader[i]); });
    rows = legacyRows.map(function (r) { return r.slice(0, 5).concat(keep.map(function (i) { return r[i]; }), ['']); });
  }
  header.push(TOTAL_HEADER);
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  rows = sortByClassOrder_(rows, 1, 2, 3);
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  refreshTotalColumn_(sheet);
  return sheet;
}

// 점수를 읽기만 할 때 쓴다. 시트가 아직 없으면 빈 표로 본다.
function readScores_(ss, subject) {
  var sheet = getScoreSheet_(ss, subject, false);
  if (!sheet) return { header: SCORE_FIXED_HEADER.slice(), data: [] };
  var values = sheet.getDataRange().getValues();
  var header = values.shift() || SCORE_FIXED_HEADER.slice();
  return { header: header, data: values };
}

function getAbsentSheet_(ss, subject) {
  var name = subjectSheetName_('결시명단', subject);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, 5).setValues([ABSENT_HEADER]);
  }
  return sheet;
}

// 그 반의 영역별 메모를 { 영역명: 메모 } 로 읽는다.
function readClassMemos_(ss, subjectId, grade, cls) {
  var sheet = ss.getSheetByName(MEMO_SHEET);
  var memos = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2 || !subjectId) return memos;
  sheet.getRange(2, 1, lastRow - 1, 5).getValues().forEach(function (r) {
    if (r[0] === subjectId && String(r[1]) === String(grade) && String(r[2]) === String(cls) && r[3] && r[4]) {
      memos[String(r[3])] = String(r[4]);
    }
  });
  return memos;
}

// 이 반(과목ID+학년+반)의 영역별 메모 행을 통째로 새 값으로 바꾼다. 다른 반의 행은 그대로 두고, 빈 메모는 행을 남기지 않는다.
function saveClassMemos_(ss, subjectId, grade, cls, memos) {
  if (!subjectId || !grade || !cls) return;
  memos = memos || {};
  var sheet = ss.getSheetByName(MEMO_SHEET);
  var lastRow = sheet.getLastRow();
  var data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];
  var others = data.filter(function (r) {
    return !(r[0] === subjectId && String(r[1]) === String(grade) && String(r[2]) === String(cls));
  });
  var newRows = Object.keys(memos)
    .filter(function (name) { return String(memos[name] || '').trim(); })
    .map(function (name) { return [subjectId, grade, cls, name, String(memos[name]).trim()]; });
  var all = others.concat(newRows);
  sheet.clear();
  sheet.getRange(1, 1, 1, 5).setValues([MEMO_HEADER]);
  if (all.length) sheet.getRange(2, 1, all.length, 5).setValues(all);
}

function verifyPassword_(ss, password) {
  var stored = String(getCfgMap_(ss)['비밀번호'] || '');
  return stored !== '' && String(password || '') === stored;
}

function verifyTeacherPassword(password) {
  var ss = ensureSheets_();
  return { ok: verifyPassword_(ss, password) };
}

var isScored_ = function (v) { return v !== '' && v !== null && v !== undefined && !isNaN(v); };

/* ---------- 학생용 ---------- */

function getRosterOptions() {
  var ss = ensureSheets_();
  var roster = ss.getSheetByName('명단');
  var data = roster.getRange(2, 1, Math.max(roster.getLastRow() - 1, 0), 4).getValues();
  var tree = {};
  data.forEach(function (r) {
    var g = String(r[0]), c = String(r[1]), n = String(r[2]);
    if (!g) return;
    tree[g] = tree[g] || {};
    tree[g][c] = tree[g][c] || {};
    tree[g][c][n] = true;
  });
  var grades = Object.keys(tree).sort(function (a, b) { return Number(a) - Number(b); });
  var cfg = getCfgMap_(ss);
  var subjects = getSubjects_(ss);
  var result = {
    grades: grades, byGrade: {},
    year: cfg['연도'], semester: cfg['학기'],
    subjectNames: subjects.map(function (s) { return s.name; })
  };
  grades.forEach(function (g) {
    var classes = Object.keys(tree[g]).sort(function (a, b) { return Number(a) - Number(b); });
    result.byGrade[g] = { classes: classes, byClass: {} };
    classes.forEach(function (c) {
      result.byGrade[g].byClass[c] = Object.keys(tree[g][c]).sort(function (a, b) { return Number(a) - Number(b); });
    });
  });
  return result;
}

function getStudentResult(grade, cls, number, name) {
  var ss = ensureSheets_();
  var roster = ss.getSheetByName('명단');
  var data = roster.getRange(2, 1, Math.max(roster.getLastRow() - 1, 0), 4).getValues();

  var matches = data.filter(function (r) {
    return String(r[0]) === String(grade) && String(r[1]) === String(cls) && String(r[2]) === String(number);
  });
  if (matches.length === 0) {
    return { ok: false, error: '해당 학년/반/번호의 학생을 찾을 수 없습니다.' };
  }
  var nameMatches = matches.filter(function (r) { return String(r[3]).trim() === String(name).trim(); });
  if (nameMatches.length === 0) {
    return { ok: false, error: '이름이 일치하지 않습니다. 학년·반·번호와 이름을 다시 확인해주세요.' };
  }

  var cfg = getCfgMap_(ss);
  // "수업 과목 설정"에서 이 학생의 학급 전체가 연결됐거나, 이 학생이 개별수강생으로 추가된 과목이 이 학생이 듣는 과목이다.
  var studentSubjects = getSubjects_(ss).filter(function (s) {
    return isEnrolled_(s, grade, cls, number);
  });
  if (studentSubjects.length === 0) {
    return { ok: false, error: '이 학생에게 연결된 수업 과목이 아직 없습니다.' };
  }

  var studentName = nameMatches[0][3];
  var subjects = studentSubjects.map(function (instance) {
    var subjectName = instance.name;
    var scores = readScores_(ss, subjectName); // 과목마다 다른 시트
    var scoreData = scores.data;
    var scoreHeader = scores.header;
    var domainDefs = getDomainsForSubject_(ss, instance.id);

    var scoreRow = null;
    for (var j = 0; j < scoreData.length; j++) {
      var sr = scoreData[j];
      if (String(sr[0]) === subjectName && String(sr[1]) === String(grade) && String(sr[2]) === String(cls) && String(sr[3]) === String(number)) {
        scoreRow = sr;
        break;
      }
    }

    var domains = domainDefs.map(function (d) {
      var colIdx = scoreHeader.indexOf(d.name);
      var raw = (scoreRow && colIdx >= 0) ? scoreRow[colIdx] : '';
      var done = isScored_(raw);
      var state;
      if (done) {
        state = 'done';
      } else if (d.status === '이번 수행') {
        state = 'current';
      } else {
        var anyScored = colIdx >= 0 && scoreData.some(function (r) {
          return String(r[0]) === subjectName && isScored_(r[colIdx]);
        });
        state = anyScored ? 'notdone' : 'upcoming';
      }
      return { name: d.name, max: d.max, group: d.group, score: done ? Number(raw) : null, done: done, state: state };
    });

    var total = domains.reduce(function (sum, d) { return sum + (d.done ? d.score : 0); }, 0);
    var totalMax = domains.reduce(function (sum, d) { return sum + (d.done ? d.max : 0); }, 0);
    var fullMax = domains.reduce(function (sum, d) { return sum + d.max; }, 0);

    return {
      subject: subjectName,
      domains: domains,
      total: total,
      totalMax: totalMax,
      fullMax: fullMax,
      declaredTotal: instance.declaredTotal || 0,
      doneCount: domains.filter(function (d) { return d.done; }).length,
      currentCount: domains.filter(function (d) { return d.state === 'current'; }).length,
      notDoneCount: domains.filter(function (d) { return d.state === 'notdone'; }).length,
      upcomingCount: domains.filter(function (d) { return d.state === 'upcoming'; }).length,
      domainCount: domains.length
    };
  });

  return {
    ok: true,
    year: cfg['연도'],
    semester: cfg['학기'],
    grade: grade,
    class: cls,
    number: number,
    name: studentName,
    subjects: subjects
  };
}

/* ---------- 교사용 ---------- */

function getTeacherConfig(password) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var cfg = getCfgMap_(ss);
  var subjects = getSubjects_(ss).map(function (s) {
    return {
      id: s.id, name: s.name, declaredTotal: s.declaredTotal,
      classPairs: s.classPairs, students: s.students, domains: getDomainsForSubject_(ss, s.id)
    };
  });
  return {
    year: cfg['연도'], semester: cfg['학기'],
    classCounts: getClassCounts_(cfg),
    subjects: subjects,
    sheetUrl: ss.getUrl()
  };
}

function saveTeacherConfig(password, cfg) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var cfgSheet = ss.getSheetByName('설정');
    cfgSheet.getRange(1, 1, 2, 2).setValues([
      ['연도', cfg.year],
      ['학기', cfg.semester]
    ]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function saveSubjects(password, subjects) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var clean = subjects
      .map(function (s) {
        return {
          name: String(s.name).trim(),
          declaredTotal: Number(s.declaredTotal) || 0, classPairs: s.classPairs || [],
          id: String(s.id || '').trim() || Utilities.getUuid(), students: s.students || []
        };
      })
      .filter(function (s) { return s.name; })
      .slice(0, MAX_SUBJECTS);

    var sheet = ss.getSheetByName('과목');
    sheet.clear();
    sheet.getRange(1, 1, 1, 4).setValues([SUBJECT_HEADER]);
    if (clean.length) {
      sheet.getRange(2, 1, clean.length, 4).setValues(clean.map(function (s) {
        return [s.name, s.declaredTotal, serializeClassPairs_(s.classPairs), s.id];
      }));
    }

    // 개별수강생은 과목명마다 "출석명단_과목명" 시트에 (이름이 같은 과목은 한 시트에 모음)
    var roster = ss.getSheetByName('명단');
    var rosterRows = roster.getLastRow() > 1 ? roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues() : [];
    var enrollByName = {};
    clean.forEach(function (s) {
      var valid = s.students.filter(function (p) { return p && p.grade && p.cls && p.number; }).map(function (p) {
        return { grade: String(p.grade), cls: String(p.cls), number: String(p.number) };
      });
      enrollByName[s.name] = (enrollByName[s.name] || []).concat(valid);
    });
    Object.keys(enrollByName).forEach(function (name) { writeEnrollSheet_(ss, name, enrollByName[name], rosterRows); });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// 영역 정의(이름·배점·그룹·상태)를 저장한다. 상태(완료/이번 수행/예정)는 그 과목을 듣는 모든 반에 똑같이 적용된다.
function saveDomains(password, subjectId, domains) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var clean = domains
      .map(function (d) {
        return {
          name: String(d.name).trim(), max: Number(d.max) || 0, group: String(d.group || '').trim(),
          status: DOMAIN_STATUSES.indexOf(d.status) !== -1 ? d.status : '예정'
        };
      })
      .filter(function (d) { return d.name; });

    var domSheet = ss.getSheetByName('영역');
    var lastRow = domSheet.getLastRow();
    var allRows = lastRow > 1 ? domSheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];
    var otherRows = allRows.filter(function (r) { return r[0] !== subjectId; });
    var newRows = otherRows.concat(clean.map(function (d) { return [subjectId, d.name, d.max, d.group, d.status]; }));

    domSheet.clear();
    domSheet.getRange(1, 1, 1, 5).setValues([DOMAIN_HEADER]);
    if (newRows.length) {
      domSheet.getRange(2, 1, newRows.length, 5).setValues(newRows);
    }
    applyDomainStatusValidation_(domSheet);

    // 그 과목의 점수 시트에 새로 생긴 영역명 컬럼만 추가한다 (기존 컬럼은 보존).
    var owner = getSubjects_(ss).filter(function (s) { return s.id === subjectId; })[0];
    if (owner) {
      var scoreSheet = getScoreSheet_(ss, owner.name, true);
      ensureTotalColumn_(scoreSheet);
      var scoreLastCol = scoreSheet.getLastColumn();
      var header = scoreLastCol > 0 ? scoreSheet.getRange(1, 1, 1, scoreLastCol).getValues()[0] : SCORE_FIXED_HEADER.slice();
      var missing = clean.map(function (d) { return d.name; }).filter(function (name) { return header.indexOf(name) === -1; });
      if (missing.length) {
        // 새 영역 열은 "합계" 열 앞에 끼워 넣어서 합계가 항상 맨 오른쪽에 있게 한다.
        var totalIdx = header.indexOf(TOTAL_HEADER);
        scoreSheet.insertColumnsBefore(totalIdx + 1, missing.length);
        scoreSheet.getRange(1, totalIdx + 1, 1, missing.length).setValues([missing]);
      }
      refreshTotalColumn_(scoreSheet);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function getClassScores(password, subject, grade, cls) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var instance = resolveSubjectInstance_(getSubjects_(ss), subject, grade, cls);
  var domains = instance ? getDomainsForSubject_(ss, instance.id) : [];

  var roster = ss.getSheetByName('명단');
  var rosterData = roster.getRange(2, 1, Math.max(roster.getLastRow() - 1, 0), 4).getValues()
    .filter(function (r) {
      return String(r[0]) === String(grade) && String(r[1]) === String(cls) && (!instance || isEnrolled_(instance, grade, cls, r[2]));
    })
    .sort(function (a, b) { return Number(a[2]) - Number(b[2]); });

  var scoresBook = readScores_(ss, subject);
  var scoreData = scoresBook.data;
  var scoreHeader = scoresBook.header;

  var students = rosterData.map(function (r) {
    var num = r[2], name = r[3];
    var scoreRow = scoreData.filter(function (sr) {
      return String(sr[0]) === subject && String(sr[1]) === String(grade) && String(sr[2]) === String(cls) && String(sr[3]) === String(num);
    })[0];
    var scores = {};
    domains.forEach(function (d) {
      var idx = scoreHeader.indexOf(d.name);
      scores[d.name] = (scoreRow && idx >= 0 && scoreRow[idx] !== '') ? scoreRow[idx] : '';
    });
    return { number: num, name: name, scores: scores };
  });

  return { domains: domains, students: students };
}

// 데이터 비교용: 그 과목을 듣는 모든 학급의 영역별 평균과 합계 평균.
// 점수가 입력된 학생만 평균에 넣는다 (빈 칸·결시 제외). 합계는 점수가 하나라도 있는 학생의 영역 점수 합.
function getSubjectAverages(password, subject) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var subjects = getSubjects_(ss);
  var seen = {}, pairs = [];
  subjects.filter(function (s) { return s.name === subject; }).forEach(function (s) {
    subjectClasses_(s).forEach(function (p) {
      var key = p.grade + '-' + p.cls;
      if (!seen[key]) { seen[key] = true; pairs.push(p); }
    });
  });
  pairs.sort(function (a, b) { return (Number(a.grade) - Number(b.grade)) || (Number(a.cls) - Number(b.cls)); });

  var roster = ss.getSheetByName('명단');
  var rosterData = roster.getLastRow() > 1 ? roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues() : [];
  var book = readScores_(ss, subject);

  var classes = pairs.map(function (p) {
    var instance = resolveSubjectInstance_(subjects, subject, p.grade, p.cls);
    var domains = instance ? getDomainsForSubject_(ss, instance.id) : [];
    var numbers = {};
    rosterData.forEach(function (r) {
      if (String(r[0]) === String(p.grade) && String(r[1]) === String(p.cls) && (!instance || isEnrolled_(instance, p.grade, p.cls, r[2]))) {
        numbers[String(r[2])] = true;
      }
    });
    var rows = book.data.filter(function (r) {
      return String(r[0]) === subject && String(r[1]) === String(p.grade) && String(r[2]) === String(p.cls) && numbers[String(r[3])];
    });
    var totals = [];
    var stats = domains.map(function (d) {
      var idx = book.header.indexOf(d.name);
      return { name: d.name, max: d.max, sum: 0, n: 0, idx: idx };
    });
    rows.forEach(function (r) {
      var rowSum = 0, any = false;
      stats.forEach(function (st) {
        if (st.idx < 0) return;
        var raw = r[st.idx];
        if (raw === '' || raw === null || raw === undefined || isAbsentValue_(raw)) return;
        var v = Number(raw);
        if (isNaN(v)) return;
        st.sum += v; st.n++; rowSum += v; any = true;
      });
      if (any) totals.push(rowSum);
    });
    var maxSum = domains.reduce(function (s, d) { return s + d.max; }, 0);
    return {
      grade: String(p.grade), cls: String(p.cls),
      domains: stats.map(function (st) {
        return { name: st.name, max: st.max, n: st.n, avg: st.n ? st.sum / st.n : null };
      }),
      total: {
        max: maxSum, n: totals.length,
        avg: totals.length ? totals.reduce(function (s, v) { return s + v; }, 0) / totals.length : null
      }
    };
  });
  return { classes: classes };
}

function saveClassScores(password, subject, grade, cls, students) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var scoreSheet = getScoreSheet_(ss, subject, true);
    ensureTotalColumn_(scoreSheet);
    var lastRow = scoreSheet.getLastRow();
    var lastCol = scoreSheet.getLastColumn();
    var header = scoreSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = lastRow > 1 ? scoreSheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    var rowIndexMap = {};
    data.forEach(function (r, i) { rowIndexMap[r[0] + '-' + r[1] + '-' + r[2] + '-' + r[3]] = i; });

    // 결시로 표시돼 있던 칸에 반별 점수 입력 표에서 직접 점수를 넣으면, 그 학생·영역의 결시를 풀어준 것으로 본다.
    var resolvedAbsences = []; // [{domain, number}]

    students.forEach(function (stu) {
      var key = subject + '-' + grade + '-' + cls + '-' + stu.number;
      var idx = rowIndexMap[key];
      if (idx === undefined) {
        var newRow = new Array(header.length).fill('');
        newRow[0] = subject; newRow[1] = grade; newRow[2] = cls; newRow[3] = stu.number; newRow[4] = stu.name;
        data.push(newRow);
        idx = data.length - 1;
        rowIndexMap[key] = idx;
      }
      var row = data[idx];
      Object.keys(stu.scores).forEach(function (d) {
        var colIdx = header.indexOf(d);
        if (colIdx >= 0) {
          var v = stu.scores[d];
          var wasAbsent = isAbsentValue_(row[colIdx]);
          var isEmpty = (v === '' || v === null || v === undefined);
          row[colIdx] = isEmpty ? '' : Number(v);
          if (wasAbsent && !isEmpty) resolvedAbsences.push({ domain: d, number: stu.number });
        }
      });
    });

    data = sortByClassOrder_(data, 1, 2, 3);
    scoreSheet.getRange(2, 1, data.length, header.length).setValues(data);
    refreshTotalColumn_(scoreSheet);
    if (resolvedAbsences.length) removeResolvedAbsences_(ss, subject, grade, cls, resolvedAbsences);
    return { ok: true, savedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

// 수업 과목 설정의 "이 과목을 수강하는 학생 추가하기" 검색용: 전 학년 명단
function getRosterAll(password) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var roster = ss.getSheetByName('명단');
  var data = roster.getLastRow() > 1 ? roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues() : [];
  return {
    students: sortByClassOrder_(data.filter(function (r) { return r[0] && r[3]; }), 0, 1, 2).map(function (r) {
      return { grade: String(r[0]), cls: String(r[1]), number: String(r[2]), name: String(r[3]) };
    })
  };
}

// 학생 명단은 과목과 상관없이 학급(학년·반) 단위다.
function getRosterForClass(password, grade, cls) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var roster = ss.getSheetByName('명단');
  var data = roster.getRange(2, 1, Math.max(roster.getLastRow() - 1, 0), 4).getValues()
    .filter(function (r) { return String(r[0]) === String(grade) && String(r[1]) === String(cls); })
    .map(function (r) { return { number: String(r[2]), name: String(r[3]) }; })
    .sort(function (a, b) { return Number(a.number) - Number(b.number); });
  return { students: data };
}

function saveRosterForClass(password, grade, cls, students) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var clean = students
      .map(function (s) { return { number: String(s.number).trim(), name: String(s.name).trim() }; })
      .filter(function (s) { return s.number && s.name; });

    var roster = ss.getSheetByName('명단');
    var lastRow = roster.getLastRow();
    var data = lastRow > 1 ? roster.getRange(2, 1, lastRow - 1, 4).getValues() : [];
    var others = data.filter(function (r) {
      return !(String(r[0]) === String(grade) && String(r[1]) === String(cls));
    });
    var newRows = others.concat(clean.map(function (s) { return [grade, cls, s.number, s.name]; }));

    roster.clear();
    roster.getRange(1, 1, 1, 4).setValues([['학년', '반', '번호', '이름']]);
    if (newRows.length) {
      roster.getRange(2, 1, newRows.length, 4).setValues(newRows);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function getAttendanceForClass(password, subject, grade, cls) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var instance = resolveSubjectInstance_(getSubjects_(ss), subject, grade, cls);
  var domains = instance ? getDomainsForSubject_(ss, instance.id) : [];

  var roster = ss.getSheetByName('명단');
  var rosterData = roster.getRange(2, 1, Math.max(roster.getLastRow() - 1, 0), 4).getValues()
    .filter(function (r) {
      return String(r[0]) === String(grade) && String(r[1]) === String(cls) && (!instance || isEnrolled_(instance, grade, cls, r[2]));
    })
    .sort(function (a, b) { return Number(a[2]) - Number(b[2]); });

  var scoresBook = readScores_(ss, subject);
  var scoreData = scoresBook.data;
  var scoreHeader = scoresBook.header;

  var students = rosterData.map(function (r) {
    var num = r[2], name = r[3];
    var scoreRow = scoreData.filter(function (sr) {
      return String(sr[0]) === subject && String(sr[1]) === String(grade) && String(sr[2]) === String(cls) && String(sr[3]) === String(num);
    })[0];
    var absent = {}, hasScore = {};
    domains.forEach(function (d) {
      var idx = scoreHeader.indexOf(d.name);
      var raw = (scoreRow && idx >= 0) ? scoreRow[idx] : '';
      var isAbsent = isAbsentValue_(raw);
      absent[d.name] = isAbsent;
      hasScore[d.name] = raw !== '' && !isAbsent;
    });
    return { number: num, name: name, absent: absent, hasScore: hasScore };
  });

  var memos = instance ? readClassMemos_(ss, instance.id, grade, cls) : {};
  var statuses = {}; // 영역 상태는 "영역" 시트 값 — 통계·메모 필터용으로 함께 돌려준다
  domains.forEach(function (d) { statuses[d.name] = d.status; });

  return { domains: domains, students: students, memos: memos, statuses: statuses };
}

// memos: 그 반의 영역별 메모 { 영역명: 글 } — "영역메모" 시트에 저장된다. (영역 상태는 saveDomains 로 "영역" 시트에 저장)
function saveAttendanceForClass(password, subject, grade, cls, students, memos) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var instance = resolveSubjectInstance_(getSubjects_(ss), subject, grade, cls);
    if (instance) saveClassMemos_(ss, instance.id, grade, cls, memos);

    var scoreSheet = getScoreSheet_(ss, subject, true);
    ensureTotalColumn_(scoreSheet);
    var lastRow = scoreSheet.getLastRow();
    var lastCol = scoreSheet.getLastColumn();
    var header = scoreSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = lastRow > 1 ? scoreSheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    var rowIndexMap = {};
    data.forEach(function (r, i) { rowIndexMap[r[0] + '-' + r[1] + '-' + r[2] + '-' + r[3]] = i; });

    students.forEach(function (stu) {
      var key = subject + '-' + grade + '-' + cls + '-' + stu.number;
      var idx = rowIndexMap[key];
      if (idx === undefined) {
        var newRow = new Array(header.length).fill('');
        newRow[0] = subject; newRow[1] = grade; newRow[2] = cls; newRow[3] = stu.number; newRow[4] = stu.name;
        data.push(newRow);
        idx = data.length - 1;
        rowIndexMap[key] = idx;
      }
      var row = data[idx];
      Object.keys(stu.absent).forEach(function (domainName) {
        var colIdx = header.indexOf(domainName);
        if (colIdx < 0) return;
        if (stu.absent[domainName]) {
          row[colIdx] = ABSENT_MARKER;
        } else if (isAbsentValue_(row[colIdx])) {
          row[colIdx] = '';
        }
      });
    });

    data = sortByClassOrder_(data, 1, 2, 3);
    scoreSheet.getRange(2, 1, data.length, header.length).setValues(data);
    refreshTotalColumn_(scoreSheet);

    var domainNames = instance ? getDomainsForSubject_(ss, instance.id).map(function (d) { return d.name; }) : [];
    updateAbsentRoster_(ss, subject, grade, cls, domainNames, students);

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// 결시명단도 과목마다 별도 시트("결시명단_과목명")에 기록한다.
function updateAbsentRoster_(ss, subject, grade, cls, domainNames, students) {
  var sheet = getAbsentSheet_(ss, subject);
  var lastRow = sheet.getLastRow();
  var data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];

  // 이 반의 이 과목에 속한 영역들 범위 안의 기존 행은 지우고, 지금 체크된 상태로 다시 채운다.
  var others = data.filter(function (r) {
    return !(String(r[1]) === String(grade) && String(r[2]) === String(cls) && domainNames.indexOf(String(r[0])) !== -1);
  });
  var newRows = [];
  students.forEach(function (stu) {
    Object.keys(stu.absent).forEach(function (domainName) {
      if (stu.absent[domainName]) {
        newRows.push([domainName, grade, cls, stu.number, stu.name]);
      }
    });
  });
  var all = sortByClassOrder_(others.concat(newRows), 1, 2, 3);

  sheet.clear();
  sheet.getRange(1, 1, 1, 5).setValues([ABSENT_HEADER]);
  if (all.length) {
    sheet.getRange(2, 1, all.length, 5).setValues(all);
  }
}

// 반별 점수 입력 표에서 결시 칸에 직접 점수를 넣었을 때, 결시명단_과목명 시트에서도 그 학생·영역 행을 지워 맞춰준다.
function removeResolvedAbsences_(ss, subject, grade, cls, resolvedAbsences) {
  var sheet = getAbsentSheet_(ss, subject);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var toRemove = {};
  resolvedAbsences.forEach(function (r) { toRemove[r.domain + '|' + r.number] = true; });
  var kept = data.filter(function (r) {
    if (String(r[1]) !== String(grade) || String(r[2]) !== String(cls)) return true;
    return !toRemove[String(r[0]) + '|' + String(r[3])];
  });
  if (kept.length === data.length) return; // 바뀐 게 없으면 다시 쓰지 않는다
  sheet.clear();
  sheet.getRange(1, 1, 1, 5).setValues([ABSENT_HEADER]);
  if (kept.length) {
    sheet.getRange(2, 1, kept.length, 5).setValues(kept);
  }
}

// 결시자 수행안내 PDF용: 점수 시트에서 "결시"로 표시된 학생 전체를 (영역·학년·반·번호 순으로) 모아서 돌려준다.
function getAbsentees(password, subject) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var subjects = getSubjects_(ss);
  var scoresBook = readScores_(ss, subject);
  var data = scoresBook.data;
  var header = scoresBook.header;
  var domainCache = {};
  var rows = [];

  data.forEach(function (r) {
    if (String(r[0]) !== subject) return;
    var instance = resolveSubjectInstance_(subjects, subject, r[1], r[2]);
    if (!instance) return;
    var domains = domainCache[instance.id] || (domainCache[instance.id] = getDomainsForSubject_(ss, instance.id));
    domains.forEach(function (d, order) {
      var idx = header.indexOf(d.name);
      if (idx >= 0 && isAbsentValue_(r[idx])) {
        rows.push({ domain: d.name, order: order, grade: String(r[1]), cls: String(r[2]), number: String(r[3]), name: String(r[4]) });
      }
    });
  });

  rows.sort(function (a, b) {
    return (a.order - b.order) || (Number(a.grade) - Number(b.grade)) || (Number(a.cls) - Number(b.cls)) || (Number(a.number) - Number(b.number));
  });
  var domainNames = [];
  rows.forEach(function (r) { if (domainNames.indexOf(r.domain) === -1) domainNames.push(r.domain); });
  return { rows: rows, domains: domainNames };
}

// 홈 화면 흐름 보드의 단계 카드에 보여줄 값을 과목마다 계산한다 (홈에서 과목 탭을 바꾸면 그 과목의 값을 보여준다).
// subjects: [{ subject, absentPending: 결시로 표시된 항목 수, performRate, currentDomains: 지금 "이번 수행"인 영역 이름들 }]
// performRate 는 상태가 "이번 수행"인 영역-학생 조합 중 점수가 입력된 비율이다(빈 칸·결시 제외).
// 여러 반·영역을 한 번에 훑어야 해서 화면에서 여러 번 나눠 부르는 대신 여기서 한 번에 계산해 돌려준다.
function getHomeStats(password) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  var subjects = getSubjects_(ss);
  var names = [];
  subjects.forEach(function (s) { if (names.indexOf(s.name) === -1) names.push(s.name); });

  var roster = ss.getSheetByName('명단');
  var rosterData = roster.getLastRow() > 1 ? roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues() : [];

  return { subjects: names.map(function (name) {
    var absentPending = 0, performTotal = 0, performDone = 0, currentDomains = [];
    var book = readScores_(ss, name);
    var rowIndex = {};
    book.data.forEach(function (r, i) { rowIndex[r[1] + '-' + r[2] + '-' + r[3]] = i; });

    var seen = {}, pairs = [];
    subjects.filter(function (s) { return s.name === name; }).forEach(function (s) {
      subjectClasses_(s).forEach(function (p) {
        var key = p.grade + '-' + p.cls;
        if (!seen[key]) { seen[key] = true; pairs.push(p); }
      });
    });

    pairs.forEach(function (p) {
      var instance = resolveSubjectInstance_(subjects, name, p.grade, p.cls);
      if (!instance) return;
      var domains = getDomainsForSubject_(ss, instance.id);
      var classNumbers = rosterData
        .filter(function (r) {
          return String(r[0]) === String(p.grade) && String(r[1]) === String(p.cls) && isEnrolled_(instance, p.grade, p.cls, r[2]);
        })
        .map(function (r) { return String(r[2]); });

      domains.forEach(function (d) {
        var idx = book.header.indexOf(d.name);
        if (idx < 0) return;
        var isCurrent = d.status === '이번 수행';
        classNumbers.forEach(function (num) {
          var row = book.data[rowIndex[p.grade + '-' + p.cls + '-' + num]];
          var raw = row ? row[idx] : '';
          var absent = isAbsentValue_(raw);
          if (absent) absentPending++;
          if (isCurrent) {
            performTotal++;
            if (raw !== '' && raw !== null && raw !== undefined && !absent) performDone++;
          }
        });
      });
    });

    // 지금 진행 중("이번 수행")인 영역 — 같은 이름의 과목(학년별 ID)끼리 영역명이 같으면 한 번만
    subjects.filter(function (s) { return s.name === name; }).forEach(function (s) {
      getDomainsForSubject_(ss, s.id).forEach(function (d) {
        if (d.status === '이번 수행' && currentDomains.indexOf(d.name) === -1) currentDomains.push(d.name);
      });
    });

    return {
      subject: name,
      absentPending: absentPending,
      performRate: performTotal ? Math.round(performDone / performTotal * 100) : null,
      currentDomains: currentDomains
    };
  }) };
}

function getSheetUrl(password) {
  var ss = ensureSheets_();
  if (!verifyPassword_(ss, password)) throw new Error('비밀번호가 올바르지 않습니다.');
  return ss.getUrl();
}
