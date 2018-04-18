"use strict";

let db = require('./db');

const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);

async function resetSchema() {
  let script = await readFile('reset.sql', 'utf8');
  return await db.query(script);
}

const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const { expect } = chai;

const app = require('./app');

describe('Bids Following Asks', function() {
  beforeEach(async function() {
    await resetSchema();
    await db.query(`INSERT INTO traders (id, name) VALUES
    (6, 'ana'),
    (7, 'chris'),
    (8, 'barb')`);
    await db.query(`INSERT INTO portfolios (trader_id, ticker, quantity) VALUES
    (6, 'X', 10),
    (6, '$', 1000),
    (7, 'Y', 10),
    (8, '$', 1000),
    (8, 'Y', 10),
    (8, 'Z', 10)`
  );
  });

  it('orders are fulfilled if prices match', async function() {
    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 2,
      price: 10
    });
    expect(ask).to.have.status(200);

    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let orders = await chai.request(app).get('/orders');
    expect(orders).to.have.status(200);

    //Find the orders we just placed, verify that they have been fulfilled
    let askId = ask.body.id;
    let bidId = bid.body.id;
    let matchingOrders = orders.body.orders.filter(order => (order.id === askId || order.id === bidId));

    expect(matchingOrders.length).to.equal(2);
    for (let order of matchingOrders) {
      expect(order.fulfilled).to.equal(order.quantity);
    }
  });

  it('if bid is higher than ask, orders are fulfilled at ask price', async function() {
    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 2,
      price: 8
    });
    expect(ask).to.have.status(200);

    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 2,
      price: 9
    });
    expect(bid).to.have.status(200);

    let portfolio6 = await chai.request(app)
    .get('/portfolios/6/$');
    let portfolio8 = await chai.request(app)
    .get('/portfolios/8/$')

    expect(portfolio6.body[0].quantity).to.equal(1016);
    expect(portfolio8.body[0].quantity).to.equal(984);
  });

  it('check with different ticker', async function() {
    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 7,
      ticker: 'Y',
      type: 'ask',
      quantity: 2,
      price: 10
    });
    expect(ask).to.have.status(200);

    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'Y',
      type: 'bid',
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let portfolio8 = await chai.request(app)
    .get('/portfolios/8/$')

    expect(bid.body.fulfilled).to.equal(2);
    expect(portfolio8.body[0].quantity).to.equal(980);
  });
});

describe('Asks Following Bids', function() {
  beforeEach(async function() {
    await resetSchema();
    await db.query(`INSERT INTO traders (id, name) VALUES
    (6, 'ana'),
    (7, 'chris'),
    (8, 'barb')`);
    await db.query(`INSERT INTO portfolios (trader_id, ticker, quantity) VALUES
    (6, 'X', 10),
    (6, '$', 1000),
    (7, 'Y', 10),
    (8, '$', 1000),
    (8, 'Y', 10),
    (8, 'Z', 10)`
  );
  });

  it('orders are fulfilled if prices match', async function() {
    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 2,
      price: 10
    });
    expect(ask).to.have.status(200);

    let orders = await chai.request(app).get('/orders');
    expect(orders).to.have.status(200);

    //Find the orders we just placed, verify that they have been fulfilled
    let askId = ask.body.id;
    let bidId = bid.body.id;
    let matchingOrders = orders.body.orders.filter(order => (order.id === askId || order.id === bidId));

    expect(matchingOrders.length).to.equal(2);
    for (let order of matchingOrders) {
      expect(order.fulfilled).to.equal(order.quantity);
    }
  });

  it('if bid is higher than ask, orders are fulfilled at bid price', async function() {
    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 2,
      price: 9
    });
    expect(ask).to.have.status(200);

    let portfolio6 = await chai.request(app)
    .get('/portfolios/6/$');
    let portfolio8 = await chai.request(app)
    .get('/portfolios/8/$')

    expect(portfolio6.body[0].quantity).to.equal(1020);
    expect(portfolio8.body[0].quantity).to.equal(980);
  });

  it('check with different ticker', async function() {
    let bid = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'Y',
      type: 'bid',
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let ask = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 7,
      ticker: 'Y',
      type: 'ask',
      quantity: 2,
      price: 10
    });
    expect(ask).to.have.status(200);

    let portfolio8 = await chai.request(app)
    .get('/portfolios/8/$')

    expect(ask.body.fulfilled).to.equal(2);
    expect(portfolio8.body[0].quantity).to.equal(980);
  });
});

describe('Delayed Order Fulfillment', function() {
  beforeEach(async function() {
    await resetSchema();
    await db.query(`INSERT INTO traders (id, name) VALUES
    (6, 'ana'),
    (7, 'chris'),
    (8, 'barb')`);
    await db.query(`INSERT INTO portfolios (trader_id, ticker, quantity) VALUES
    (6, 'X', 10),
    (6, '$', 1000),
    (7, 'Y', 10),
    (8, '$', 1000),
    (8, 'Y', 10),
    (8, 'Z', 10)`
    );
  });

  it('bids following asks', async function() {
    let first = chai.request(app)
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 2,
      price: 10
    });

    let second = chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 2,
      price: 9
    });

    let third = chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'Y',
      type: 'bid',
      quantity: 2,
      price: 10
    });

    await Promise.all([first, second, third]);

    let orders = await chai.request(app)
      .get('/orders');
    orders.body.orders.map((order) => {
      expect(order.fulfilled).to.equal(0);
    });

    let fourth = await chai.request(app)
    .post('/orders')
    .send({
      trader_id: 8,
      ticker: 'X',
      type: 'bid',
      quantity: 1,
      price: 10
    });

    orders = await chai.request(app)
      .get('/orders');
     orders.body.orders.map((order) => {
       if(order.trader_id === 6) expect(order.fulfilled).to.equal(1);
       if(order.quantity === 1) expect(order.fulfilled).to.equal(1);
     });

     let portfolio6 = await chai.request(app)
      .get('/portfolios/6/$');
     let portfolio8 = await chai.request(app)
      .get('/portfolios/8/$')

     expect(portfolio6.body[0].quantity).to.equal(1010);
     expect(portfolio8.body[0].quantity).to.equal(990);

     let fifth = await chai.request(app)
     .post('/orders')
     .send({
       trader_id: 8,
       ticker: 'X',
       type: 'bid',
       quantity: 1,
       price: 10
     });

     orders = await chai.request(app)
       .get('/orders');
      orders.body.orders.map((order) => {
        if(order.trader_id === 6) expect(order.fulfilled).to.equal(2);
        if(order.quantity === 1) expect(order.fulfilled).to.equal(1);
      });

      portfolio6 = await chai.request(app)
       .get('/portfolios/6/$');
      portfolio8 = await chai.request(app)
       .get('/portfolios/8/$')

      expect(portfolio6.body[0].quantity).to.equal(1020);
      expect(portfolio8.body[0].quantity).to.equal(980);

      let last = await chai.request(app)
      .post('/orders')
      .send({
        trader_id: 8,
        ticker: 'X',
        type: 'bid',
        quantity: 1,
        price: 10
      });

      orders = await chai.request(app)
        .get('/orders');
      //the last order should not be fulfilled
      expect(orders.body.orders[orders.body.orders.length-1].fulfilled).to.equal(0);
  });
});

// it('found all portfolios', async function() {
//   let allPortfolios = await chai.request(app)
//   .get('/portfolios');
//   expect(allPortfolios.body.length).to.equal(6)
// })
