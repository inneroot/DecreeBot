import { Decree } from '../types/Decree'
import { User } from "../types/User"
import { tMessage } from "../types/Query"
import { batchScraping } from './xRay'
import { logger } from './logger'
const hLogger = logger.child({ module: 'helper' })

async function compareDecrees(latestInDb: Decree[], latestOnSite: Decree[]): Promise<Decree[]> {
  hLogger.trace(`Comparing ${latestInDb.length} from DB with ${latestOnSite.length} from page`)
  const SetDB: Set<string> = new Set()
  const NewDecrees: Decree[] = []
  latestInDb.forEach((decree: Decree) => SetDB.add(decree.url))
  latestOnSite.forEach((decree: Decree) => { if (!SetDB.has(decree.url)) NewDecrees.push(decree) })
  hLogger.info(`${NewDecrees.length} new decrees`)
  const DetailedDecrees = await batchScraping(NewDecrees)
  return DetailedDecrees
}

function getUser(msg: tMessage): User {
  return {
    chatId: msg.chat.id,
    username: msg.chat.username,
    name: msg.chat.first_name + ' ' + msg.chat.last_name
  }
}

const formatString = (newDecrees: Decree[]): string[] => {
  if (!Array.isArray(newDecrees)) {
    return [`error: 'newDecrees' should be Array`]
  }
  const result = []
  if (newDecrees.length > 10) {
    result.push(`Указов: ${newDecrees.length} \nПоследние 10 указов:\n`)
    newDecrees = newDecrees.slice(0, 10)
  }
  newDecrees.forEach((decree) => {
    result.push(`<a href="${decree.url}">${decree.date.toLocaleDateString()} №${decree.number}: ${decree.title}</a>\n${decree.text}\n`)
  })
  return result
}

export { compareDecrees, getUser, formatString }
