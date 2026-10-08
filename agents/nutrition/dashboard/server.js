'use strict';
const path = require('path');
const agentDir = path.resolve(__dirname, '..');
require('../../../kit/dashboard/shell').start({ agentDir, routes: require('./routes')(agentDir) });
