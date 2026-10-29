// Mission 2 — 주문 생성과 상태 관리 (SRS: FR-ORD-01, FR-ORD-02, FR-STK-01~03 / US-07)
// 계약은 docs/API_CONTRACT.md 의 "2. 주문" 을 읽는다.
const { AppError } = require("./errors");
const { copy } = require("./util");

const ORDER_STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT", // 결제대기
  PAID: "PAID", // 결제완료
  PREPARING: "PREPARING", // 배송준비
  SHIPPING: "SHIPPING", // 배송중
  DELIVERED: "DELIVERED", // 배송완료
  CANCELED: "CANCELED", // 취소
};

// from 상태에서 to 상태로 바꿀 수 있으면 true. (docs/API_CONTRACT.md 의 상태 전이표 참고)
function canTransition(from, to) {
  const transitions = new Map([
    ["PENDING_PAYMENT", ["PAID", "CANCELED"]],
    ["PAID", ["PREPARING", "CANCELED"]],
    ["PREPARING", ["SHIPPING"]],
    ["SHIPPING", ["DELIVERED"]],
  ]);
  return transitions.get(from)?.includes(to) ?? false;
}

// 주문 상태를 바꾼다. 없는 주문은 NOT_FOUND, 허용되지 않은 전이는 INVALID_STATE. 바뀐 주문의 복사본을 돌려준다.
function changeStatus(ctx, orderId, to) {
  const order = ctx.store.orders.get(orderId);
  if (!order) throw new AppError("NOT_FOUND", "주문을 찾을 수 없습니다", { orderId });
  if (!canTransition(order.status, to)) {
    throw new AppError("INVALID_STATE", "허용되지 않은 상태 전이입니다", { from: order.status, to });
  }
  order.status = to;
  return copy(order);
}

// 장바구니의 상품으로 주문을 만든다. input = { address }
function createOrder(ctx, userId, input = {}) {
  if (typeof input?.address !== "string" || !input.address.trim()) {
    throw new AppError("INVALID_ADDRESS", "배송지가 필요합니다");
  }
  const cart = ctx.store.carts.get(userId);
  if (!cart?.size) throw new AppError("EMPTY_CART", "장바구니가 비었습니다");
  const shortages = [];
  const items = [];
  for (const [productId, quantity] of cart) {
    const product = ctx.store.products.get(productId);
    const available = product?.status === "ON_SALE" ? product.stock : 0;
    if (quantity > available) {
      shortages.push({ productId, name: product?.name ?? productId, requested: quantity, available });
    } else {
      items.push({ productId, name: product.name, unitPrice: product.price, quantity });
    }
  }
  if (shortages.length) throw new AppError("OUT_OF_STOCK", "재고가 부족합니다", { shortages });
  const order = {
    id: `ORD-${String(ctx.store.seq.order + 1).padStart(4, "0")}`,
    userId, status: ORDER_STATUS.PENDING_PAYMENT, items,
    totalAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    address: input.address.trim(), createdAt: ctx.clock.now().toISOString(),
  };
  // 검사와 변경 사이에 await를 두지 않아 마지막 재고를 중복 예약하지 않는다.
  for (const item of items) ctx.store.products.get(item.productId).stock -= item.quantity;
  ctx.store.seq.order += 1;
  ctx.store.orders.set(order.id, order);
  cart.clear();
  return copy(order);
}

module.exports = { ORDER_STATUS, canTransition, changeStatus, createOrder };
