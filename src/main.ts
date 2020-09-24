import { tMessage, tQuery } from "../types/Query"
import { User } from "../types/User"
import { SubscribeUser, unSubscribeUser, addDecrees, dbLatest, getSubscribers } from './dataLayer'
import { scrapDecrees, batchScraping, scrapLatest } from './xRay'
import { compareDecrees, getUser, formatString } from './helpers'
import { logger } from './logger'
import { Decree } from '../types/Decree'
const cron = require('node-cron')
const tLogger = logger.child({ module: 'telegram' })

process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })

tLogger.info('System start')
cron.schedule('* * 4,12,16,20 * *', checkNew);

async function checkNew() {
  tLogger.info(`checkNew`)
  const latestInDb = await dbLatest()
  const latestOnSite = await scrapLatest()
  const difference = await compareDecrees(latestInDb, latestOnSite)
  if (difference.length > 0) {
    await addDecrees(difference)
    distribution(difference)
  }
}

const distribution = async (newDecrees: Decree[]) => {
  const users = await getSubscribers()
  const msgArr = formatString(newDecrees)
  tLogger.info(`Sending ${newDecrees.length} new decrees to ${users.length} subscribers`)
  users.forEach(user => {
    sendMessageArr(user.chatId, msgArr)
  })
}

bot.onText(/\/subscribe/, async (msg: tMessage) => {
  const user = getUser(msg)
  const response = await SubscribeUser(user)
  bot.sendMessage(user.chatId, response)
})


bot.onText(/\/check/, async (msg: tMessage) => {
  const user = getUser(msg)
  bot.sendMessage(user.chatId, `Checking for new...`)
  checkNew()
})

bot.onText(/\/fetch/, async (msg: tMessage) => {
  const user = getUser(msg)
  tLogger.info(`Fetch command from @${user.username}`)
  bot.sendMessage(user.chatId, 'Fetching...')
  const decrees = await scrapDecrees()
  const decreesFull = await batchScraping(decrees)
  const answer = await addDecrees(decreesFull)
  bot.sendMessage(user.chatId, answer)
})

bot.onText(/\/start/, (msg: tMessage) => {
  const user = getUser(msg)
  tLogger.trace({ msg: `Start`, chatId: user.chatId, username: user.username })
  bot.sendMessage(user.chatId, 'Choose action:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'latest',
            callback_data: 'latest'
          },
          {
            text: 'subscribe',
            callback_data: 'subscribe'
          },
          {
            text: 'unsub',
            callback_data: 'unsub'
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

  tLogger.trace(query.data, user)
  processQuery(query.data, user)
})

async function processQuery(req: string, user: User) {
  let answer = 'error. function not working yet'
  switch (req) {
    case 'latest': {
      const latestInDb = await dbLatest(10)
      const messageArr = formatString(latestInDb)
      sendMessageArr(user.chatId, messageArr)
      break
    }
    case 'subscribe': {
      answer = await SubscribeUser(user)
      bot.sendMessage(user.chatId, answer)
      break
    }
    case 'unsub': {
      answer = await unSubscribeUser(user)
      bot.sendMessage(user.chatId, answer)
      break
    }
    default:
      bot.sendMessage(user.chatId, answer)
      tLogger.error({ msg: "unhandled query: ", query: req, chatId: user.chatId, username: user.username })
  }
}

function sendMessageArr(chatId: number, messageArr: string[]) {
  messageArr.forEach(msg => {
    bot.sendMessage(chatId, msg, { parse_mode: 'HTML' })
  })
}
