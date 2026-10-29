const test = require('node:test');
const assert = require('node:assert/strict');
const { createContext, createFakeClock, seedOrder } = require('../src/testkit');
const { getOrderDetail, listOrders } = require('../src/orderQuery');

test('상세 권한: 타인의 주문은 NOT_FOUND', () => {
  const ctx = createContext(); const order = seedOrder(ctx, {userId:'owner'});
  assert.throws(() => getOrderDetail(ctx, 'other', order.id), e => e.code === 'NOT_FOUND');
});
test('주문 가격 스냅샷: 상품 가격 변경 후에도 주문 당시 금액', () => {
  const ctx = createContext(); const order = seedOrder(ctx, {items:[['P1',2]]});
  ctx.store.products.get('P1').price = 1;
  const detail = getOrderDetail(ctx, 'u1', order.id);
  assert.equal(detail.items[0].unitPrice, 15000); assert.equal(detail.totalAmount, 30000);
});
test('최신순: 같은 시각은 주문번호 내림차순', () => {
  const clock = createFakeClock(); const ctx = createContext({clock});
  const old = seedOrder(ctx, {}); clock.advanceMinutes(1);
  const newer = seedOrder(ctx, {}); const newest = seedOrder(ctx, {});
  assert.deepEqual(listOrders(ctx,'u1',{pageSize:10}).items.map(x=>x.orderId), [newest.id,newer.id,old.id]);
});
test('첫 페이지: 첫 주문부터 반환', () => {
  const ctx = createContext(); const order = seedOrder(ctx, {});
  assert.equal(listOrders(ctx,'u1',{page:1,pageSize:1}).items[0]?.orderId, order.id);
});
test('대표 상품: 첫 상품 외 나머지 종류 수', () => {
  const ctx = createContext(); seedOrder(ctx,{items:[['P1',1],['P2',1]]});
  assert.equal(listOrders(ctx,'u1',{page:1,pageSize:10}).items[0]?.representativeName, '무선 마우스 외 1건');
});
