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

describe('test', function() {
  beforeEach(async function() {
    await resetSchema();
    await db.query(`INSERT INTO traders (id, name) VALUES
    (6, 'ana'),
    (8, 'barb'),
    (7, 'chris')`);
    await db.query(`INSERT INTO portfolios (trader_id, ticker, quantity) VALUES
    (6, 'X', 10),
    (6, '$', 1000),
    (7, 'Y', 10),
    (8, '$', 1000),
    (8, 'Y', 10),
    (8, 'Z', 10)`,
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
      trader_id: 8, //different trader
      ticker: 'X',
      type: 'bid', //buy
      quantity: 2,
      price: 10
    });
    expect(bid).to.have.status(200);

    let orders = await chai.request(app).get('/orders');
    expect(orders).to.have.status(200);

    //Find the orders we just placed, verify that they have been fulfilled
    let askId = ask.body.id;
    let bidId = bid.body.id;
    let matchingOrders = orders.body.filter(order => (order.id === askId || order.id === bidId));

    expect (matchingOrders.length).to.equal(2);
    for (let order of matchingOrders) {
      expect(order.fulfilled).to.equal(order.quantity);
    }
  });

    it('found all portfolios', async function() {
      let allPortfolios = await chai.request(app)
      .get('/portfolios');
      expect(allPortfolios.body.length).to.equal(2)
    })
});
