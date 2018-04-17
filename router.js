const pool = require('./db');
const express = require('express');
const router = express.Router();
const { traders, orders, portfolios } = require('./queries');

router.post('/traders', async function(req, res, next) {
  try {
    let trader = await traders.create(req.body);
    res.json(trader.rows[0]);
  }
  catch (e) {
    next(e);
  }
});

router.get('/orders', async function(req, res, next) {
  try {
    let allOrders = await orders.get();
    res.json({ orders: allOrders.rows});
  } catch (e) {
    next(e);
  }
});

router.post('/orders', async function(req, res, next) {
  // TODO handle cases where orders are partially fulfilled
  try {
    let order = await orders.create(req.body);
    res.json(order.rows[0]);
  } catch (e) {
    if (e === 'Error: Balance not high enough') {
      res.status(400).send();
    } else {
      next(e);
    }
  }
});

router.get('/portfolios', async function(req, res, next) {
  try {
    let allPortfolios = await portfolios.get();
    res.json(allTraderPortfolios.rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
