// Mission 3 — 결제 (SRS: FR-PAY-01, FR-PAY-02, FR-PAY-05 / US-08)
// 계약은 docs/API_CONTRACT.md 의 "3. 결제" 를 읽는다. 외부 결제대행사는 ctx.pg (모의 PG) 로 호출한다.
const { AppError } = require("./errors");
const { copy, findOwnedOrder } = require("./util");
const { changeStatus } = require("./order");

// 본인의 '결제대기' 주문을 결제한다. 성공하면 { order, payment, alreadyPaid } 를 돌려준다.
async function payOrder(ctx, userId, orderId) {
  const order = findOwnedOrder(ctx, userId, orderId);
  const key = `pay:${orderId}`;
  if (ctx.store.inflight.has(key)) return copy(await ctx.store.inflight.get(key));
  const attempts = ctx.store.payments.get(orderId) ?? [];
  const succeeded = attempts.find((payment) => payment.status === "SUCCEEDED");
  if (succeeded) return copy({ order, payment: succeeded, alreadyPaid: true });
  if (order.status !== "PENDING_PAYMENT") {
    throw new AppError("INVALID_STATE", "결제대기 주문만 결제할 수 있습니다", { from: order.status, to: "PAID" });
  }
  const operation = Promise.resolve().then(async () => {
    const payment = {
      id: `PAY-${String(++ctx.store.seq.payment).padStart(4, "0")}`,
      orderId, amount: order.totalAmount, status: "PENDING", attempt: attempts.length + 1,
    };
    attempts.push(payment);
    ctx.store.payments.set(orderId, attempts);
    let result;
    try {
      result = await ctx.pg.charge({ orderId, amount: payment.amount, idempotencyKey: `${orderId}:${payment.id}` });
    } catch {
      result = { ok: false, reason: "PG_ERROR" };
    }
    if (!result.ok) {
      payment.status = "FAILED";
      payment.failureReason = result.reason;
      throw new AppError("PAYMENT_FAILED", "결제에 실패했습니다", { reason: result.reason });
    }
    payment.status = "SUCCEEDED";
    payment.txId = result.txId;
    payment.paidAt = ctx.clock.now().toISOString();
    changeStatus(ctx, orderId, "PAID");
    return copy({ order, payment, alreadyPaid: false });
  });
  ctx.store.inflight.set(key, operation);
  try {
    return copy(await operation);
  } finally {
    ctx.store.inflight.delete(key);
  }
}

module.exports = { payOrder };
