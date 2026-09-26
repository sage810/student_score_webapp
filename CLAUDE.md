# Karpathy-Inspired Claude Code Guidelines

## 개요
Andrej Karpathy의 LLM 코딩 관찰에서 파생된 단일 `CLAUDE.md` 파일로 Claude Code 동작을 개선하는 프로젝트입니다.

## 핵심 문제점

Karpathy가 지적한 주요 이슈들:
- "모델들이 당신을 대신해 잘못된 가정을 하고 확인 없이 진행합니다"
- "코드와 API를 과도하게 복잡하게 만들고, 추상화를 부풀리며, 죽은 코드를 정리하지 않습니다"
- "직교하는 작업에도 불구하고 충분히 이해하지 못한 주석과 코드를 변경/제거합니다"

## 4가지 핵심 원칙

### 1. Think Before Coding
가정을 명시화하고 혼란을 드러내며 트레이드오프를 제시합니다.

### 2. Simplicity First
문제를 해결하는 최소한의 코드만 작성합니다. 투기적 기능이나 불필요한 추상화 제거.

### 3. Surgical Changes
요청사항과 직접 관련된 변경만 수행합니다. 기존 코드 무단 개선 금지.

### 4. Goal-Driven Execution
성공 기준을 정의하고 검증할 때까지 반복합니다. 명령형이 아닌 선언형 목표 설정.

## 설치 방법

**옵션 A (권장):** Claude Code 플러그인
```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

**옵션 B:** 프로젝트별 CLAUDE.md 파일 추가

## 라이센스
MIT

---

**프로젝트 통계:** ⭐ 215.2k | 🔀 21.7k forks | 👀 1.2k watchers
