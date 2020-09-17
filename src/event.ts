const EventEmitter = require('events');

class MyEmitter extends EventEmitter { }

const nodeEmitter = new MyEmitter();

export { nodeEmitter }