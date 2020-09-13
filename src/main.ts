import { tMessage } from "../types/Query";
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