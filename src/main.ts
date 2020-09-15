import { tMessage, tQuery } from "../types/Query"
import { User } from "../types/User"
import { SubscribeUser, addDecrees } from './dataLayer'
import { scrapDecrees, getDecreeDetails } from './xRay'
import { logger } from './logger'
import { Decree } from '../types/Decree';
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
      const decrees = await scrapDecrees(6)
      const decreesFull = await getDetails(decrees)
      answer = await addDecrees(decreesFull)
      bot.sendMessage(user.chatId, answer)
      break
    case 'db':
      bot.sendMessage(user.chatId, `In database links`)
      break
    case 'latest':
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

async function getDetails(decrees: Array<Decree>): Promise<Array<Decree>> {
  const newDecreesPromises = decrees.map((decree) => getDecreeDetails(decree))
  return await Promise.all(newDecreesPromises)
}