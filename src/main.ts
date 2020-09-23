import { tMessage, tQuery } from "../types/Query"
import { User } from "../types/User"
import { SubscribeUser, addDecrees, dbLatest, getSubscribers } from './dataLayer'
import { scrapDecrees, getDecreeDetails, batchScraping, scrapLatest, getDetails } from './xRay'
import { logger } from './logger'
import { nodeEmitter } from './event'
import { Decree } from '../types/Decree';
const tLogger = logger.child({ module: 'telegram' })

process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })

tLogger.info('System start')


async function checkNew() {
  tLogger.info(`checkNew`)
  const latestInDb = await dbLatest()
  const latestOnSite = await scrapLatest()
  const difference = compareDecrees(latestInDb, latestOnSite)
  await updateDB(difference)
  distribution(difference)
}

const updateDB = async (newDecrees: Decree[]) => addDecrees(await getDetails(newDecrees))

const distribution = async (newDecrees: Decree[]) => {
  const users = await getSubscribers()
  tLogger.info(`Sending ${newDecrees.length} new decrees to ${users.length} subscribers`)
  users.forEach(user => {
    bot.sendMessage(user.chatId, formatString(newDecrees), { parse_mode: 'HTML' })
  })
}

const formatString = (newDecrees: Decree[]) => {
  if (!Array.isArray(newDecrees)) {
    return `error: \'ewDecrees\' should be Array`
  }
  let result = `Новых указов: ${newDecrees.length}\n`
  if (newDecrees.length > 10) {
    result += `Последние 10 указов\n`
    newDecrees = newDecrees.slice(0, 10)
  }
  newDecrees.forEach((decree) => {
    result += `<a href="${decree.url}">${decree.title}</a>\n`
  })
  return result
}

function compareDecrees(latestInDb: Decree[], latestOnSite: Decree[]) {
  tLogger.trace(`Comparing ${latestInDb.length} from DB with ${latestOnSite.length} from page`)
  const SetDB: Set<string> = new Set()
  const NewDecrees: Decree[] = []
  latestInDb.forEach((decree: Decree) => SetDB.add(decree.url))
  latestOnSite.forEach((decree: Decree) => { if (!SetDB.has(decree.url)) NewDecrees.push(decree) })
  tLogger.info(`Added ${NewDecrees.length} decrees`)
  return NewDecrees
}

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
  tLogger.trace({ msg: `Start`, chatId: user.chatId, username: user.username })
  bot.sendMessage(user.chatId, 'Choose action:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'fetch',
            callback_data: 'fetch'
          },
          {
            text: 'db',
            callback_data: 'db'
          },
          {
            text: 'latest',
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

  tLogger.trace(query.data, user)
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
      checkNew()
      //const latestInDb = await dbLatest(10)
      //bot.sendMessage(user.chatId, latestInDb)
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



nodeEmitter.on('Added decrees', (data) => tLogger.debug(data))
nodeEmitter.on('Modified decrees', (data) => tLogger.debug(data))
nodeEmitter.on('Removed decrees', (data) => tLogger.debug(data))