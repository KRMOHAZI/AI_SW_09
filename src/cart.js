// Mission 1 — 장바구니 (SRS: FR-CART-01, FR-CART-02 / US-05, US-06)
// 계약(입력 · 출력 · 오류 코드)은 docs/API_CONTRACT.md 의 "1. 장바구니" 를 읽는다.
const { AppError } = require("./errors");

const MAX_QTY = 99;

// 장바구니에 상품을 담는다. 이미 담긴 상품이면 수량을 합산한다. 담은 뒤의 장바구니(getCart 형식)를 돌려준다.
function addToCart(ctx, userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    throw new AppError("INVALID_QUANTITY", "수량은 1~99 정수여야 합니다");
  }
  const product = ctx.store.products.get(productId);
  if (!product || product.status !== "ON_SALE") throw new AppError("NOT_FOUND", "상품을 찾을 수 없습니다");
  const cart = ctx.store.carts.get(userId) ?? new Map();
  const previous = cart.get(productId) ?? 0;
  const next = previous + quantity;
  if (next > MAX_QTY) throw new AppError("INVALID_QUANTITY", "합산 수량은 99 이하여야 합니다");
  if (next > product.stock) {
    throw new AppError("OUT_OF_STOCK", "재고가 부족합니다", { maxAddable: Math.max(0, product.stock - previous) });
  }
  cart.set(productId, next);
  ctx.store.carts.set(userId, cart);
  return getCart(ctx, userId);
}

// 담긴 상품의 수량을 quantity 로 바꾼다. 바뀐 장바구니를 돌려준다.
function changeQuantity(ctx, userId, productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    throw new AppError("INVALID_QUANTITY", "수량은 1~99 정수여야 합니다");
  }
  const cart = ctx.store.carts.get(userId);
  const product = ctx.store.products.get(productId);
  if (!cart?.has(productId) || !product || product.status !== "ON_SALE") {
    throw new AppError("NOT_FOUND", "장바구니 상품을 찾을 수 없습니다");
  }
  if (quantity > product.stock) {
    throw new AppError("OUT_OF_STOCK", "재고가 부족합니다", { maxAddable: Math.max(0, product.stock) });
  }
  cart.set(productId, quantity);
  return getCart(ctx, userId);
}

// 담긴 상품을 장바구니에서 뺀다. 바뀐 장바구니를 돌려준다.
function removeItem(ctx, userId, productId) {
  const cart = ctx.store.carts.get(userId);
  if (!cart?.has(productId)) throw new AppError("NOT_FOUND", "장바구니 상품을 찾을 수 없습니다");
  cart.delete(productId);
  return getCart(ctx, userId);
}

// 장바구니를 { userId, items: [{ productId, name, unitPrice, quantity, lineTotal }], totalAmount } 형식으로 돌려준다.
function getCart(ctx, userId) {
  const items = [...(ctx.store.carts.get(userId) ?? new Map())].map(([productId, quantity]) => {
    const product = ctx.store.products.get(productId);
    return { productId, name: product.name, unitPrice: product.price, quantity, lineTotal: product.price * quantity };
  });
  return { userId, items, totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}

module.exports = { addToCart, changeQuantity, removeItem, getCart, MAX_QTY };
