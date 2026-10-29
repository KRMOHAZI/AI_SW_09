// Mission 4 — 주문 취소와 환불 (SRS: FR-ORD-04, FR-PAY-03, FR-STK-01 / US-10)
// 계약은 docs/API_CONTRACT.md 의 "4. 취소 · 환불" 을 읽는다.
const { AppError } = require("./errors");
const { findOwnedOrder, restoreStock } = require("./util");
const { changeStatus } = require("./order");

// 본인의 주문을 취소한다. 성공하면 { order } 를 돌려준다.
async function cancelOrder(ctx, userId, orderId) {
  const order = findOwnedOrder(ctx, userId, orderId);
  const key = `cancel:${orderId}`;
  if (ctx.store.inflight.has(key)) return structuredClone(await ctx.store.inflight.get(key));
  if (!["PENDING_PAYMENT", "PAID"].includes(order.status)) {
    throw new AppError("INVALID_STATE", "취소할 수 없는 주문입니다", { from: order.status, to: "CANCELED" });
  }
  const operation = Promise.resolve().then(async () => {
    if (order.status === "PAID") {
      const payment = (ctx.store.payments.get(orderId) ?? []).find(p => p.status === "SUCCEEDED");
      if (!payment) throw new AppError("INVALID_STATE", "결제 기록이 없습니다");
      let result;
      try { result = await ctx.pg.refund({ txId: payment.txId, amount: payment.amount }); }
      catch { result = { ok: false, reason: "PG_ERROR" }; }
      const at = ctx.clock.now().toISOString();
      if (!result.ok) {
        payment.refund = { status: "FAILED", reason: result.reason, at };
        throw new AppError("REFUND_FAILED", "환불에 실패했습니다", { reason: result.reason });
      }
      payment.status = "REFUNDED";
      payment.refund = { status: "SUCCEEDED", refundId: result.refundId, at };
    }
    changeStatus(ctx, orderId, "CANCELED");
    restoreStock(ctx, order);
    return structuredClone({ order });
  });
  ctx.store.inflight.set(key, operation);
  try { return structuredClone(await operation); }
  finally { ctx.store.inflight.delete(key); }
}

module.exports = { cancelOrder };
