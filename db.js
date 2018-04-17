"use strict";

const { Pool } = require('pg');
const pool = new Pool ({ database: 'perf' });

module.exports = pool;
