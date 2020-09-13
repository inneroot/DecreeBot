import { tMessage } from "../types/Query";
import { SubscribeUser } from './dataLayer'
import { logger } from './logger'
const tLogger = logger.child({ module: 'telegram' })

process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })

function saveId(msg: tMessage): number {
  const chatId: number = msg.chat.id
  return chatId
}


bot.onText(/\/subscribe/, async (msg: tMessage) => {
  const chatId = saveId(msg)
  const response = await SubscribeUser(msg)
  bot.sendMessage(chatId, response)
})

bot.onText(/\/start/, (msg: tMessage) => {
  const chatId = saveId(msg)
  tLogger.info(`Start from chat ${chatId}`)
  bot.sendMessage(chatId, 'Choose action:', {
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