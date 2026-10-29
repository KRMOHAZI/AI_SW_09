# AI 사용 기록

실행자: Codex. 사람의 직접 테스트·diff 승인·역할 교대는 확인되지 않았으며 아래 결과는 AI 실행 기록이다. 사용자는 조건에 맞춘 개발과 자동 커밋을 지시했다. 구현 전에 계약과 공개 테스트를 읽고 함수별 계획을 제시한다. 사람의 계획 수정은 없었으며 별도의 팀 검토가 필요하다.

## M0 준비
- 스타터 압축을 해제하고 기존 README는 보존, 스타터 README는 docs/STARTER_README.md에 배치했다.
- 환경 연결 중단 후 사용자 복구 요청에 따라 재개했다.
- 기본 npm test는 하위 프로세스 실행 문제로 8개 파일 중 7개 실패만 표시했다. `--test-isolation=none`으로 진단하여 실제 45개(통과 2, 실패 40, TODO 3)를 확인했다.
- 패키지 설치나 공개 테스트 변경 없이 실행 옵션으로 해결했다. 동일 명령 반복 대신 실행 방식 진단을 수행했다.

## M1 장바구니
- 계획: getCart → addToCart → changeQuantity → removeItem, 각 함수 구현 후 관련 검증.
- getCart 직접 검사(빈 목록·합계·복사) 통과, 담기 관련 공개 테스트 8개 통과, 변경 관련 3개 통과, 최종 M1 12/12 통과.
- 테스트 명령: `node --test --test-isolation=none test/m1_cart.test.js`.
- maxAddable의 담기/대체 의미 차이를 공개 테스트와 대조하여 PLAN에 기록했다. 구현 재시도 0회. AI가 변경 범위와 검사 후 변경 순서를 확인했다. 사람 검토는 미수행.

## M2 주문
- canTransition → changeStatus → createOrder 순서로 구현했다. 상태 전이 1개, 상태 변경 2개를 먼저 검증하고 M2 전체 9/9 통과.
- 검사와 변경을 분리해 부족 상품을 모두 모으며, 동기 구간에서 재고를 차감한다. 스냅샷과 ctx.clock을 사용한다.
- 명령: `node --test --test-isolation=none test/m2_order.test.js`. 구현 재시도 0회. AI diff 검토, 사람 검토 미수행.

## M3 결제
- 주문 소유권, 주문별 진행 Promise, 시도별 결제 기록과 실패 재시도를 구현했다. M3 7/7 통과 (`node --test --test-isolation=none test/m3_payment.test.js`). 구현 재시도 0회. AI 검토, 사람 검토 미수행.

## M4 취소·환불
- 환불 결과를 먼저 확인하고 성공 시에만 주문 상태와 재고를 변경한다. 주문별 Promise로 동시 취소를 합친다.
- M4 6/6 통과 (`node --test --test-isolation=none test/m4_cancel.test.js`). 구현 재시도 0회. AI 검토, 사람 검토 미수행.

## M5 조회 리뷰
- 소유권·가격 스냅샷·정렬·페이지·대표명 결함을 기록하고 재현 테스트 5개를 먼저 작성했다. 수정 전 0/5 통과.
- 처음 대표명 테스트는 페이지 오류에 가려졌다. 페이지 등 4개 수정 후 4/5 통과하고 대표명 테스트만 실패하는 것을 확인한 다음 대표명 결함을 수정했다.
- `node --test --test-isolation=none test/m5_review.test.js test/m5_student.test.js` 결과 8/8 통과. AI 검토, 사람 검토 미수행.

## 도전 및 전체 검증
- 만료 시계를 ctx.clock에서 읽고 경과 시간이 기준 이상인 결제대기 주문만 취소한다. test/c_expiry.test.js 3/3 통과, 구현 재시도 0회.
- `npm test -- --test-isolation=none`: 총 47개 통과, 실패·건너뜀·TODO 0. Node 기본 격리 실행의 하위 프로세스 문제로 동일한 테스트를 단일 프로세스로 실행했다.
- 작업 전후의 사람 승인, 역할 교대, 발표는 수행되지 않았다. 제출 전 팀의 검토가 필요하다.
