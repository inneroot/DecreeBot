import { tMessage, tQuery } from "../types/Query"
import { User } from "../types/User"
import { SubscribeUser, addDecrees, query } from './dataLayer'
import { scrapDecrees, getDecreeDetails, batchScraping } from './xRay'
import { logger } from './logger'
import { nodeEmitter } from './event'
const tLogger = logger.child({ module: 'telegram' })

process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })

tLogger.info('System start')

function getUser(msg: tMessage): User {
  return {
    chatId: msg.chat.id,
    username: msg.chat.username,
    name: msg.chat.first_name + ' ' + msg.chat.last_name
  }
}

bot.onText(/\/subscribe/, async (msg: tMessage) => {
  const user = getUser(msg)
  const response = await SubscribeUser(user)
  bot.sendMessage(user.chatId, response)
})

bot.onText(/\/start/, (msg: tMessage) => {
  const user = getUser(msg)
  tLogger.info({ msg: `Start`, chatId: user.chatId, username: user.username })
  bot.sendMessage(user.chatId, 'Choose action:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'fetch data from site',
            callback_data: 'fetch'
          },
          {
            text: 'watch db',
            callback_data: 'db'
          },
          {
            text: 'watch latest',
            callback_data: 'latest'
          },
          {
            text: 'subscribe',
            callback_data: 'subscribe'
          },
          {
            text: 'test',
            callback_data: 'test'
          },
        ]
      ]
    }
  })
})

bot.on("callback_query", (query: tQuery) => {
  const user = {
    chatId: query.message.chat.id,
    username: query.message.chat.username,
    name: query.message.chat.first_name + ' ' + query.message.chat.last_name
  }

  tLogger.debug(query.data, user)
  processQuery(query.data, user)
})

async function processQuery(req: string, user: User) {
  let answer = 'error. function not working yet'
  switch (req) {
    case 'fetch':
      tLogger.info('fetch query')
      bot.sendMessage(user.chatId, 'Fetching...')
      const decrees = await scrapDecrees()
      const decreesFull = await batchScraping(decrees)
      answer = await addDecrees(decreesFull)
      bot.sendMessage(user.chatId, answer)
      break
    case 'db':
      bot.sendMessage(user.chatId, `In database links`)
      break
    case 'latest':
      const latestDecree = query.get()
      bot.sendMessage(user.chatId, latestDecree[0])
      break
    case 'subscribe':
      answer = await SubscribeUser(user)
      bot.sendMessage(user.chatId, answer)
      break
    case 'test':
      const decr = await getDecreeDetails({ url: 'https://mepar.ru/documents/decrees/2020/06/10/121738/', title: 'test' })
      tLogger.debug(decr)
      bot.sendMessage(user.chatId, `Updated ${JSON.stringify(decr)}`)
      break
    default:
      bot.sendMessage(user.chatId, answer)
      tLogger.error({ msg: "unhandled query: ", query: req, chatId: user.chatId, username: user.username })
  }
}

//const unsubObserver = 
query.onSnapshot(querySnapshot => {
  tLogger.debug('Observer triggered')
  querySnapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      nodeEmitter.emit('Added decrees', change.doc.data());
    }
    if (change.type === 'modified') {
      nodeEmitter.emit('Modified decrees', change.doc.data());
    }
    if (change.type === 'removed') {
      nodeEmitter.emit('Removed decrees', change.doc.data());
    }
  })
}, err => {
  tLogger.error(`Encountered error in Observer: ${err}`);
})
console.log(query)

nodeEmitter.on('Added decrees', (data) => tLogger.debug(data))
nodeEmitter.on('Modified decrees', (data) => tLogger.debug(data))
nodeEmitter.on('Removed decrees', (data) => tLogger.debug(data))