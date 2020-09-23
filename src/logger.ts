
let options = { level: 'trace' }
if (process.env.NODE_ENV === 'production') { options = { level: 'info' } }
const logger = require('pino')(options)
logger.info(`process.env.NODE_ENV: '${process.env.NODE_ENV}', Option for logger: '${options.level}'`)

export { logger }