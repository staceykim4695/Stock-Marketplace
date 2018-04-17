We present these tests in the order we think you should try and get them passing. Don't worry about it if you want to mix that order up a bit, but we do definitely think you should only worry about the isolation tests after you get the rest passing.

# Orders Fulfilled Immediately

Prior to *each* of the six following tests, create the following portfolio entries:

```
trader_id,ticker,quantity
6,X,10
6,$,1000
7,Y,10
8,$,1000
8,Y,10
8,Z,10
```

And remember to clear your database after each test!

## Bids Following Asks

After each of the tests in this subsection, verify that both of the orders are completely fulfilled, also checking the portfolios table to ensure that the goods have actually traded hands.

### Same Price

Add the following orders:

```
trader_id,ticker,type,price,quantity
6,X,ask,10,2
8,X,bid,10,2
```

This trade should be fulfilled at $10.

### Bid Over Ask

Add the following orders:

```
trader_id,ticker,type,price,quantity
6,X,ask,8,2
8,X,bid,9,2
```

This trade should fulfilled at $8. (The last bid order gets to buy at the lowest
possible price, $8.)

### Different Ticker

Add the following orders:

```
trader_id,ticker,type,price,quantity
7,Y,ask,10,2
8,Y,bid,10,2
```

This trade should be fulfilled at $10.

## Asks Following Bids

Once again, after each test in this subsection, verify that both of the orders are completely fulfilled, also checking the portfolios table to ensure that the goods have actually traded hands.

### Same Price

Add the following orders:
```
trader_id,ticker,type,price,quantity
8,X,bid,10,2
6,X,ask,10,2
```

This trade should be fulfilled at $10.

### Bid Over Ask

Add the following orders:
```
trader_id,ticker,type,price,quantity
8,X,bid,10,2
6,X,ask,9,2
```

This trade should be fulfilled at $10. (Last ask order gets to sell at the
highest possible price, $10.)


### Different Ticker

Add the following orders:
```
trader_id,ticker,type,price,quantity
8,Y,bid,10,2
7,Y,ask,10,2
```

This order should be fulfilled at $10.

---

# Delayed Order Fulfillment

Prior to *each* of the two (both multi-stage) tests in this section, create the following portfolio entries:

```
trader_id,ticker,quantity
6,X,10
6,$,1000
7,Y,10
8,$,1000
8,Y,10
8,Z,10
```

And don't forget to clear your database after each test!

## Bids Following Asks

Add the following orders:
```
trader_id,ticker,type,price,quantity
6,X,ask,10,2
8,X,bid,9,2
8,Y,bid,10,2
```

And verify that none of them are at all fulfilled, also checking the portfolios data to ensure that no goods have traded hands.
(For stock X, the lowest sell order is at $10 which is higher than the highest buy order which is at $9, so no sale is made.)

Then, add the following order:

```
trader_id,ticker,type,price,quantity
8,X,bid,10,1
```

Ensure that the first order we added (trader 6 asking $10 for two shares of X) is now half fulfilled, that is, has `fulfilled` equal to one. Also check that the portfolios data reflects this.

Then add this order:

```
trader_id,ticker,type,price,quantity
8,X,bid,10,1
```

Now ensure that 6's ask for X is completely fulfilled, with matching data in portfolios.

Finally, have 8 tender one more offer:

```
trader_id,ticker,type,price,quantity
8,X,bid,10,1
```

Ensure that this order remains unfulfilled, with no change to portfolios.

## Asks Following Bids

Add the following orders:

```
trader_id,ticker,type,price,quantity
8,X,bid,10,2
6,X,ask,11,2
7,Y,ask,10,2
```

And verify that none of them are at all fulfilled, also checking the portfolios data to ensure that no goods have traded hands.
(The highest bid/buy order is lower that the lowest ask/sell order so no sale is made.) 

Then, add the following order:

```
trader_id,ticker,type,price,quantity
6,X,ask,10,1
```

Ensure that the first order we added (trader 8 asking $10 for two shares of X) is now half fulfilled, that is, has `fulfilled` equal to one. Also check that the portfolios data reflects this.

Then add this order:

```
trader_id,ticker,type,price,quantity
6,X,ask,10,1
```

Now ensure that 6's ask for X is completely fulfilled, with matching data in portfolios.

Finally, have 6 tender one more offer:

```
trader_id,ticker,type,price,quantity
6,X,ask,10,1
```

Ensure that this order remains unfulfilled, with no change to portfolios.

# Unfulfilled Orders

Create the following portfolio entries:

```
trader_id,ticker,quantity
6,X,10
6,$,1000
7,Y,10
8,$,1000
8,Y,10
8,Z,10
```

And the following orders:

```
trader_id,ticker,type,price,quantity
6,X,ask,100,10
8,X,bid,99,1
8,Z,bid,100,1

6,Z,bid,100,1
8,Z,ask,101,1
8,Y,ask,100,1
```

No trades should take place: all orders should remain totally unfulfilled, with no changes to the portfolios data as a consequence of the orders.

Don't forget to clear your database when the test is done!

# Isolation

Each test in this section will require you to run trades in multiple, concurrent API clients. As always, remember to clear your database at the conclusion of each test.

## First Test

Create the following portfolio entries:
```
trader_id,ticker,quantity
6,X,100000
7,$,50000
8,$,50000
```

then create the order:
```
trader_id,ticker,type,price,quantity
6,X,ask,1,100000
```

and then run each of these against separate application servers:

50,000 times:
create order
```
trader_id,ticker,type,price,quantity
7,X,bid,1,1
```

50,000 times:
create order
```
trader_id,ticker,type,price,quantity
8,X,bid,1,1
```

At the end of all this, trader 1 should be $100,000 richer, with no X stock, while each of 6 and 7 should have $0 and 50,000 shares of X. Also make sure that all hundred thousand orders are completely fulfilled.

## Second Test

Create the following portfolio entries:
```
trader_id,ticker,quantity
6,X,100000
7,$,50000
8,$,50000
```

then create the orders:
```
trader_id,ticker,type,price,quantity
6,X,ask,1,50000
6,X,ask,1,50000
```

and then run each of these in separate API clients:

50,000 times:
create order
```
trader_id,ticker,type,price,quantity
7,X,bid,1,1
```

50,000 times:
create order
```
trader_id,ticker,type,price,quantity
8,X,bid,1,1
```

Once again, at the end of all this, trader 1 should be $100,000 richer, with no X stock, while each of 6 and 7 should have $0 and 50,000 shares of X. Also be sure that all hundred thousand orders are completely fulfilled.

## Third Test

Create the following portfolio entries:
```
trader_id,ticker,quantity
10,X,50000
11,X,50000
12,$,50000
13,$,50000
```

Run each of these 25,000 times, one per API client:

Create order
```
trader_id,ticker,type,price,quantity
10,X,bid,1,2
```

Create order
```
trader_id,ticker,type,price,quantity
11,X,bid,1,2
```

And each of these 50,000 times, in two additional API clients:

Create order
```
trader_id,ticker,type,price,quantity
12,X,ask,1,1
```

Create order
```
trader_id,ticker,type,price,quantity
13,X,ask,1,1
```

Once again, at the end of all this, trader 1 should be $100,000 richer, with no X stock, while each of 6 and 7 should have $0 and 50000 shares of X. Also be sure that all hundred and fifty thousand orders are completely fulfilled.
