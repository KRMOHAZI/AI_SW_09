// Challenge — 결제대기 주문 자동 취소 (SRS: FR-ORD-05)
// 계약은 docs/API_CONTRACT.md 의 "6. 도전 과제" 를 읽는다.
const { restoreStock } = require("./util");
const { changeStatus } = require("./order");

// 결제대기 상태로 timeoutMinutes 분 이상 지난 주문을 취소하고 재고를 복원한다. 취소된 주문번호 배열(오름차순)을 돌려준다.
function expirePendingOrders(ctx, { timeoutMinutes = 30 } = {}) {
  const now = ctx.clock.now().getTime();
  const expired = [];
  for (const order of ctx.store.orders.values()) {
    if (order.status === "PENDING_PAYMENT" && now - new Date(order.createdAt).getTime() >= timeoutMinutes * 60000) {
      changeStatus(ctx, order.id, "CANCELED");
      restoreStock(ctx, order);
      expired.push(order.id);
    }
  }
  return expired.sort();
}

module.exports = { expirePendingOrders };
