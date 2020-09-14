import { tMessage, tQuery } from "../types/Query";
import { User } from "../types/User";
import { SubscribeUser } from './dataLayer'
import { logger } from './logger'
const tLogger = logger.child({ module: 'telegram' })

process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })


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
  switch (req) {
    case 'fetch':
      bot.sendMessage(user.chatId, `Updated  links`)
      break
    case 'db':
      bot.sendMessage(user.chatId, `In database links`)
      break
    case 'latest':
      break
    default:
      bot.sendMessage(user.chatId, `error. function not working yet`)
      tLogger.error({ msg: "unhandled query: ", query: req, chatId: user.chatId, username: user.username })
  }
}
