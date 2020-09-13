const EventEmitter = require('events');

class MyEmitter extends EventEmitter { }

const nodeEmitter = new MyEmitter();

exports.nodeEmitter = nodeEmitter