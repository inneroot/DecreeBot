import { tQuery, tMessage } from "../types/query";


process.env.NTBA_FIX_319 = '1'
const TelegramBot = require('node-telegram-bot-api')
const token = require('../../config/botToken.json')
console.log(token.BOT_TOKEN)
const bot = new TelegramBot(token.BOT_TOKEN, { polling: true })

//const interval: number = 60 * 60 * 1000
let chatIds: Set<number> = new Set()



function saveId(msg: tMessage) {
  const chatId: number = msg.chat.id
  chatIds.add(chatId)
  return chatId
}

/*nodeEmitter.on('newlinks', () => {
  const latest = getLatestLinks()
  //logger.debug(`eventEmitter.on = newlinks to ${chatIds.size} ids`)
  chatIds.forEach(chatId => {
    bot.sendMessage(chatId, formatString(latest), { parse_mode: 'HTML' })
  })
})*/

bot.onText(/\/start/, (msg: tMessage) => {
  console.log(msg)
  const chatId = saveId(msg)
  bot.sendMessage(chatId, 'Выберите команду', {
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
          }
        ]
      ]
    }
  })
})

bot.on("callback_query", (query: tQuery) => {
  const id = query.message.chat.id
  chatIds.add(id)
  //logger.debug(query.data, id)
  console.log(query)

})
/*
bot.onText(/\/check/, async (msg: tMessage) => {
  const chatId = saveId(msg)
  const newLinks = await scrapLinksAndSave()
  bot.sendMessage(chatId, `Updated ${newLinks.length} links`)
})
bot.onText(/\/db/, (msg: tMessage) => {
  const chatId = saveId(msg)
  bot.sendMessage(chatId, `In database ${loadLinks().length} links`)
})
bot.onText(/\/clear/, (msg: tMessage) => {
  const chatId = saveId(msg)
  clearLinks()
  bot.sendMessage(chatId, `clear`)
})

bot.onText(/\/emit/, (msg: tMessage) => {
  myEmitter.emit('newlinks')
})





function autocheckLinks() {
  scrapLinksAndSave()
  const ref = setInterval(() => {
    logger.debug("autoupdate")
    scrapLinksAndSave()
  }, interval);
  return ref
}

function formatString(Latest) {
  if (!Array.isArray(Latest)) {
    return `error: \'Latest\' should be Array`
  }
  let result = `Новых указов: ${Latest.length}\n`
  if (Latest.length > 10) {
    result += `Последние 10 указов\n`
    Latest = Latest.slice(0, 10)
  }
  Latest.forEach((decree) => {
    result += `<a href="${decree.link}">${decree.title}</a>\n`
  })
  return result
}

async function processQuery(req, chatId) {
  switch (req) {
    case 'fetch':
      const newLinks = await scrapLinksAndSave()
      bot.sendMessage(chatId, `Updated ${newLinks.length} links`)
      break;
    case 'db':
      bot.sendMessage(chatId, `In database ${loadLinks().length} links`)
      break;
    case 'latest':

    const latest = getLatestLinks()
      if (latest) {
        bot.sendMessage(chatId, `latest: ${formatString(latest)}`, { parse_mode: 'HTML' })
      } else {
        bot.sendMessage(chatId, `No new links`)
      }
      break;
    default:
      bot.sendMessage(chatId, `error. function not working yet`)
      //logger.error("unhandled query: ", req)
  }
}
*/