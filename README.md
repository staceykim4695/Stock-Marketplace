# Stock Market Challenge

## Background

This project will have you build the core of a functioning stock market, though the system could easily be extended to almost any other bid-ask style of marketplace, such as one for commodities, [predictions](https://www.predictit.org/), [the right to emit pollution](https://www.bloomberg.com/news/articles/2017-10-31/china-seeks-to-avoid-excessive-speculation-in-carbon-trading), or even [memes](https://www.theverge.com/2017/1/10/14223264/meme-economy-reddit-stock-market).

In case you're not familiar with how a stock market works, don't worry too much,
because we give you the details you need to know in the next section. And for
this project, you'll only be building the business logic to take orders and
execute trades, and a JSON REST API to interface to it: no need for a real
frontend. Most actual stock traders don't care too much about user interface, as
long as it lets them trade efficiently, but they (and government regulators) do
care very much that their trades are executed *correctly:* you'll need to make
use of [the previous modules on atomicity](../../day3/transactions/atom.md) to ensure that no part of
your business logic gets half-done, either creating or destroying money or
shares of stock willy-nilly; and [the module on isolation](../isolation) to *ensure
that your stock market supports multiple traders making their offers
simultaneously.*

## Core Entities and Algorithms

There are only three types of thing in our system – traders, orders, and portfolios – and only one thing they do – make trades.

### Traders

Traders are the people or organizations actually buying and selling stocks; they each have a portfolio. We're not too concerned about their attributes, so let's just give them two columns in our database: `id`, and `name`.

### Portfolios

A portfolio is the total collection of stocks owned by a trader. We represent that in our database with what's called a 'join table': a table to capture the relationship between two other entities. That table should have the following columns:

- `id`
- `trader_id` – don't forget to define a foreign key constraint!
- `ticker`, which we use as the name of a particular stock; for example, `FSLR` is the real-world ticker symbol for the solar cell manufacturer [First Solar](https://en.wikipedia.org/wiki/First_Solar)
- `quantity`, which we represent as an integer, meaning traders aren't allowed to own or trade fractions of shares.

Note:
- Since all trades in our system will be in exchange for cash, use the ticker symbol `$` to represent a trader's cash holdings
- All traders' stocks are present in a single table, with who owns what differentiated by the `trader_id` column.

### Orders

Our third and final table is `orders`, each row of which represents one trader's desire to either buy (a 'bid order', or just a 'bid') or sell (an 'ask order', or just 'ask') a certain amount of one company's stock at a specified price. That table should have the following columns:

- `id`,
- `trader_id` – again, remember to define a foreign key constraint
- `type`, either 'bid' or 'ask'
- `ticker`, naming the stock we'd like to buy or sell
- `price`, the dollar amount, per share, that the trader would like to buy or sell for
- `quantity`, also an integer (like in the `portfolios` table), and finally
- `fulfilled`, an integer indicating how much of the order has actually been either bought or sold; this of course means that orders can be partially fulfilled, more on which in a moment

### What About Stocks?

Note that we have no `stocks` table: while a real stock market would certainly want to record some further details about its stocks, we're not concerning ourselves with that for this exercise. Given that, and the fact that a stock's ticker symbol is, by design, unique within an exchange, we use the ticker symbol itself like a key. We could, hypothetically, discard the `traders` table in the same way, but seeing as how traders' names aren't guaranteed to be unique, we would have to use their numeric IDs, and it'd be nice to not have to refer to everyone in the system by just a number.

### Making Trades

Let's say one of the traders in our stock market, Warren Buffet (with an ID of 5), wants to buy ten shares of General Electric (which has the ticker symbol `GE`), at $20 a share. He would submit the following order:

- `trader_id`: 5
- `type`: `bid`
- `ticker`: `GE`
- `price`: 20
- `quantity`: 10

Obviously, he has no control over the record's ID or its fulfillment status: keeping track of those are our job.

Our application ensures that he has enough cash on hand to settle the trade, and when it checks the portfolios table, it sees:

- `trader_id`: 5
- `ticker`: `$`
- `quantity`: 200

Alright, looks good, so let's see if anyone is selling `GE` at the moment: we look for ask orders at or below the price we're bidding, which are at least partially unfulfilled. For example:

- `id`: 1
- `trader_id`: 1
- `type`: `ask`
- `ticker`: `GE`
- `price`: 15
- `quantity`: 5
- `fulfilled`: 2

This would match because the price is low enough, and we still have 3 (`quantity` minus `fulfilled`) shares to be sold on this order. On the other hand,

- `id`: 2
- `trader_id`: 2
- `type`: `ask`
- `ticker`: `GE`
- `price`: 25
- `quantity`: 5
- `fulfilled`: 0

This wouldn't match because the price is too high, while:

- `id`: 3
- `trader_id`: 3
- `type`: `ask`
- `ticker`: `GE`
- `price`: 20
- `quantity`: 5
- `fulfilled`: 5

This has a low enough price, but it wouldn't match, because all its shares have already been sold.

Once we've found our matching ask orders, our buyer wants to get the best deal, so we start with the lowest-priced ask and move up from there, until either our bid is completely fulfilled, or we run out of matching asks.

Let's say we start with our ask order #1, because $15 is the lowest price we can find, and buy the remaining three shares on that order. If that's the only matching ask we can find, our database would then look like this:

Warren's bid:
- `id`: 4
- `trader_id`: 5
- `type`: `bid`
- `ticker`: `GE`
- `price`: 20
- `quantity`: 10
- `fulfilled`: 3

Matching ask order:
- `id`: 1
- `trader_id`: 1
- `type`: `ask`
- `ticker`: `GE`
- `price`: 15
- `quantity`: 5
- `fulfilled`: 5

Warren's portfolio:
- `ticker`: `$`
- `quantity`: 155


- `ticker`: `GE`
- `quantity`: [increased by 3]

Other trader's portfolio:
- `ticker`: `$`
- `quantity`: [increased by 45]


- `ticker`: `GE`
- `quantity`: [decreased by 3]

In this case – no more matching ask orders – we're done, and we respond to Warren's order creation with the results of his trades.

Sometime later, someone submits another ask order – let's say trader #1, who has noticed a market for their GE shares, and who raises the price a bit, but not too much:

- `trader_id`: 1
- `type`: `ask`
- `ticker`: `GE`
- `price`: 18
- `quantity`: 5

This gets stored in our database under ID 5, and we immediately execute a trade, because Warren's order #4, still partially unfulfilled, bids a price lower than this ask.

Warren's bid:
- `id`: 4
- `trader_id`: 5
- `type`: `bid`
- `ticker`: `GE`
- `price`: 20
- `quantity`: 10
- `fulfilled`: 8

New ask:
- `id`: 5
- `trader_id`: 1
- `type`: `ask`
- `ticker`: `GE`
- `price`: 18
- `quantity`: 5
- `fulfilled`: 5

Warren's portfolio:
- `ticker`: `$`
- `quantity`: 65


- `ticker`: `GE`
- `quantity`: [increased by an additional 5]

Other trader's portfolio:
- `ticker`: `$`
- `quantity`: [increased by an additional 90]


- `ticker`: `GE`
- `quantity`: [decreased by an additional 5]

When you submit an ask, the process is the same, just in reverse: you assemble the bid orders with a price *at or above* (because this time, we're looking to sell) what we're asking, and proceed highest to lowest. And of course if, when you submit an order, there are no matching bids or asks to make a trade, you mark `fulfilled` with a zero for the time being and wrap up your server action.

### Concurrent Trades

Importantly, your server should support multiple traders working at the same time, via multiple application servers each talking to the same database – this configuration, of several app servers and one database, is standard. This means you'll need to ensure that your trades don't step on each other, corrupting your data. As an example of what could go wrong:

Let's say you have an ask order in the database:

- `id`: 1
- `trader_id`: 1 (let's call her Anita Asker)
- `type`: `ask`
- `ticker`: `X`
- `price`: 10
- `quantity`: 1
- `fulfilled`: 0

And into your API comes a bid order:

- `trader_id`: 2 (Thomas Two)
- `type`: `bid`
- `ticker`: `X`
- `price`: 10
- `quantity`: 1

Your server process queries the database, looking for a match, and, as it should, finds order #1. It prepares a series of `UPDATE` statements to mark both orders as fulfilled, and make the appropriate changes to each traders' portfolio. Listen to the gears of commerce whirr!

But wait! At the very same time, another trader makes the exact same bid, arriving, as luck would have it, at a different application server:

- `trader_id`: 3 (Thurgood Three)
- `type`: `bid`
- `ticker`: `X`
- `price`: 10
- `quantity`: 1

If, by sheer happenstance, this other server looks for matching bids after the first one has found its match, but before it writes its updates, what happens?

```
Mr Two                             Mr Three
-------------------------------------------
    POST /orders --> | <-- POST /orders
look for matches --> |
                     | <-- look for matches
   write updates --> |
                     | <-- write updates
 return response --> |
                     | <-- return response
-------------------------------------------
```

In this scenario, Mr Two buys one share of `X`, which is credited to his portfolio. Likewise, Ms Asker, the original owner, has one share of `X` removed from her portfolio. Then, Mr Three *also buys the same share:* he's credited with that share in his portfolio, and Ms Asker gets *another share of `X`* deducted from her portfolio. Best case scenario, Ms Asker ends up selling one more share than they intended: she's not going to be a happy customer. Worst case, Ms Asker has no more `X` to sell, and we've conjured up a new share out of thin air and transferred it to Mr Three, while telling Ms Asker they now, somehow, have -1 shares of `X`. Hopefully, Mr Three is both honest and observant, and (somehow!) sees and reports the error, but even then, neither Ms Asker nor the Securities and Exchange Commission is going to be pleased.

If you're wondering how to resolve this conundrum, you should refer back to the [earlier module on `SELECT FOR UPDATE`](../isolation).

## The API

You should implement the following endpoints:

- `POST /traders`

    - Create a trader record
    - Request body:
        - `name`: the trader's name
    - Response:
        - `id`: the server-assigned ID
        - `name`: the same name


- `POST /orders`
    - Create an order, returning the complete order record created *after any trades have been executed.* If no trades have been executed, return the order as is with `fulfilled` set to `0`.
    - Request body:
        - `trader_id`: their numeric ID, as returned from `POST /traders`
        - `type`: exactly either `bid` or `ask`
        - `ticker`: a string containing the ticker symbol of the stock we'd like to trade
        - `price`: either the lowest price we're willing to sell for, in an ask, or the highest price we're willing to buy at, for bids
        - `quantity`: the amount we'd like to either buy or sell
    - Response:
        - `id`: the server-assigned ID
        - `trader_id`: identical to request body
        - `type`: identical to request body
        - `ticker`: identical
        - `price`: identical
        - `quantity`: identical
        - `fulfilled`: a positive integer greater than or equal to zero and less than or equal to `quantity`, indicating how many shares out of the quantity request have actually been traded


- `GET /orders`
    - Retrieve all orders, across all traders
    - No request parameters
    - Response: An array containing JSON objects like those in the response to `POST /orders`


- `GET /traders/{trader_id}/portfolio`
    - Get a single trader's complete portfolio
    - Only request param is the `trader_id` path param; remember that GETs don't typically have request bodies
    - Response:
        - An array containing JSON objects like:
            - `id`: ID of the portfolio entry
            - `trader_id`: equal to the `trader_id` in the request path
            - `ticker`: the ticker symbol of the stock, or `$` for cash
            - `quantity`: the amount owned


1. `GET /portfolios`
    - Fetch all portfolio data
    - No request params
    - Response: an array containing JSON objects like those for `GET /traders/{trader_id}/portfolio`, but covering all users.


Finally, don't worry about authentication for this API: we already covered it in the Facebook project, and while in the real world it would probably be essential, we're going to assume all our traders are scrupulously honest.

## Testing

### Part 1: Manual Testing

We describe some tests for you to run, in the `tests.md` file. Each of these has some per-test starting data; a series of API calls, presented as tables of comma-separated values (CSV); and descriptions of correct final state of the database.

Execute the tests under **Orders Fulfilled Immediately**, **Delayed Order Fulfillment** and **Unfulfilled Orders** manually using Postman.
Verify that the database contents are correct according to the test cases.

### Part 2: Automated Testing

Write JavaScript tests that execute the tests under **Orders Fulfilled Immediately**, **Delayed Order Fulfillment** and **Unfulfilled Orders** automatically using Axios. These tests should:

1. Reset the application to a known initial state
1. Execute trades and validate database contents as instructed in `tests.md`

### (Bonus) Part 3: Concurrent Automated Testing

For the **Isolation** tests, you'll need to run multiple API clients concurrently, which you can do with the [`concurrently`](https://www.npmjs.com/package/concurrently) utility we've provided for you. For example, this will run three (hypothetical) tests in parallel:

```sh
concurrently "node test-1.js" "node test-2.js" "node test-3.js"
```

Remember to surround each command with quotes! `concurrently` will be installed when you `npm install`; feel free to take it out for a spin by running something simple like

```sh
concurrently "ls" "ls"
```

just to see how it formats its output.


## Libraries

You should build your server in Node.js, using two libraries which should by now be quite familiar: `express` and `node-postgres`. Feel free to bring in whatever else you think will be handy, though you probably won't need anything too out-of-the-way.

## Feature Checklist

Work on features in this exercise in the following order. Make sure
you complete each Part before moving on to the next:

1. Part 1
    1. Traders can place orders on anything for any amount/quantity
    1. Make sure traders have enough money or stock to place an order
    1. Order execution, including updating portfolio records

1. Part 2
    1. Execute trades concurrently
    1. Orders and portfolio get updated atomically
