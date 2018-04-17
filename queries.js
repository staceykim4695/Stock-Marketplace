"use strict";

const pool = require('./db');

const traders = {
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`, [trader.name]);
  }
};

const orders = {
  get: async () => {
    return await pool.query(`SELECT * FROM orders`);
  },

  create: async (order) => {
    let client = await pool.connect();
    client.query('BEGIN');
    let query;
      if (order.type === 'bid') {
        //check to see if the trader has enough money to go through with a bid
        let getBalance = await portfolios.getByTicker(order.trader_id, '$')
        let traderBalance = getBalance.rows[0].quantity;
        let price = order.quantity * order.price;
        if (traderBalance < price) {
          throw 'Error: Balance not high enough';
        }
        //if the query is a buy, look for a seller ('ask') that is low enough
        query = `SELECT * FROM orders WHERE ticker = $1 AND type = 'ask' AND fulfilled < quantity AND price <= $2 AND trader_id != $3 LIMIT $4 FOR UPDATE`;
      } else {
        //if the query is a sell, look for a buyer that is high enough
        query = `SELECT * FROM orders WHERE ticker = $1 AND type = 'bid' AND fulfilled < quantity AND price >= $2 AND trader_id != $3 LIMIT $4 FOR UPDATE`;
      }
      //find a matching order based on the query that is made (bid vs. ask)
      let matching = await client.query(query, [order.ticker, order.price, order.trader_id, order.quantity]);
      let trade;
      if (matching.rows.length) {
        console.log('Found matching order, executing trade');
        //check and see how many I can fulfill
        //then I can insert into orders
        let cur = 0;
        //have to set fulfilled to '0' in the beginning because there is no fulfilled
        order['fulfilled'] = 0;
        let needed = order.quantity - order.fulfilled;
        let orderPrice = 0;
        while (needed && cur !== matching.rows.length) {
          let avail = matching.rows[cur].quantity - matching.rows[cur].fulfilled;
          if (avail > needed) {
            matching.rows[cur].fulfilled += needed;
            orderPrice += matching.rows[cur].price * needed;
            matching.rows[cur].matchingPrice = matching.rows[cur].price * needed;
            needed -= needed;
          } else {
            needed -= avail;
            matching.rows[cur].fulfilled += avail;
            orderPrice += matching.rows[cur].price * avail;
            matching.rows[cur].matchingPrice = matching.rows[cur].price * avail;
          }
          cur++;
        }
        let newFulfilled = order.quantity - needed;
        trade = await client.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity, fulfilled) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [order.trader_id, order.type, order.ticker, order.price, order.quantity, newFulfilled]);
        await portfolios.update(client, trade.rows[0]);
        await portfolios.updateBalance(client, trade.rows[0], orderPrice);

        //update the matching order
        cur = 0;
        while (cur !== matching.rows.length) {
          await client.query(`UPDATE orders SET fulfilled = $1 WHERE id = $2`,
            [matching.rows[cur].fulfilled, matching.rows[cur].id]);
          await portfolios.update(client, matching.rows[cur]);
          await portfolios.updateBalance(client, matching.rows[cur], matching.rows[cur].matchingPrice);
          cur++;
        }

      } else {
        console.log('No matching order found, just insert');
        trade = await client.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [order.trader_id, order.type, order.ticker, order.price, order.quantity]);
      }
    client.query('COMMIT');
    client.release();
    return trade;
  }
};

const portfolios = {
  get: async () => {
    return await pool.query(`SELECT * FROM portfolios FOR UPDATE`);
  },
  
  getByTicker: async (trader, ticker) => {
    return await pool.query(`SELECT quantity FROM portfolios WHERE trader_id = $1 AND ticker = $2 FOR UPDATE`, [trader, ticker]);
  },

  update: async (client, order) => {
    let exists = await client.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = $2 FOR UPDATE`,
      [order.trader_id, order.ticker]);
    if (exists.rows.length > 0) {
      if (order.type === 'bid') {
        return await client.query(`UPDATE portfolios SET quantity = quantity + $1 WHERE trader_id = $2 AND ticker = $3`,
          [order.fulfilled, order.trader_id, order.ticker])
        } else {
          return await client.query(`UPDATE portfolios SET quantity = quantity - $1 WHERE trader_id = $2 AND ticker = $3`,
            [order.fulfilled, order.trader_id, order.ticker])
          }
    }
  },

  updateBalance: async (client, order, transactionPrice) => {
    if (order.type === 'bid') {
      return await client.query(`UPDATE portfolios SET quantity = quantity - $1 WHERE ticker = '$' AND trader_id = $2`,
      [transactionPrice, order.trader_id]);
    } else {
      return await client.query(`UPDATE portfolios SET quantity = quantity + $1 WHERE ticker = '$' AND trader_id = $2`,
      [transactionPrice, order.trader_id]);
    }
  }
};

module.exports = { traders, orders, portfolios };
