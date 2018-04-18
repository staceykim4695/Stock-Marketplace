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

describe('Isolation', function() {
  beforeEach(async function() {
    await resetSchema();
    await db.query(`INSERT INTO traders (id, name) VALUES
    (6, 'ana'),
    (7, 'chris'),
    (8, 'barb')`);
    await db.query(`INSERT INTO portfolios (trader_id, ticker, quantity) VALUES
    (6, 'X', 100000),
    (7, '$', 50000),
    (8, '$', 50000)`
    );
  });

  it('all 5 concurrent ask orders are fulfilled', async function() {
    let ask = await chai.request('http://localhost:3000')
    .post('/orders')
    .send({
      trader_id: 6,
      ticker: 'X',
      type: 'ask',
      quantity: 100000,
      price: 1
    });

    let orderRequests = [];
    let count1 = 0;
    while (count1 < 5) {
      orderRequests.push(chai.request('http://localhost:3000')
      .post('/orders')
      .send({
        trader_id: 7,
        ticker: 'X',
        type: 'bid',
        quantity: 1,
        price: 1
      }));
      count1++;
    }

    let count2 = 0;
    while (count2 < 5) {
      orderRequests.push(chai.request('http://localhost:3000')
      .post('/orders')
      .send({
        trader_id: 8,
        ticker: 'X',
        type: 'bid',
        quantity: 1,
        price: 1
      }));
      count2++;
    }

    await Promise.all(orderRequests);

    let portfolio6 = await chai.request('http://localhost:3000')
     .get('/portfolios/6/X');
    let portfolio7 = await chai.request('http://localhost:3000')
     .get('/portfolios/7/$');
    let portfolio8 = await chai.request('http://localhost:3000')
     .get('/portfolios/8/$');

     expect(portfolio6.body[0].quantity).to.equal(ask.body.quantity - 10);
     expect(portfolio7.body[0].quantity).to.equal(49995);
     expect(portfolio8.body[0].quantity).to.equal(49995);
  });
});
