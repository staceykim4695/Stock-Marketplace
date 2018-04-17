"use strict";

const express = require('express');
const app = express();
const router = require('./router');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', router);

app.use(function(err, req, res, next) {
  console.log('Error', err);
  res.status(500).json({
    error: err.message
  });
});

app.listen(3000, function() {
  console.log('Started listening on 3000');
});

module.exports = app;
