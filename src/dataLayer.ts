import { User } from "../types/User";
import { Decree } from "../types/Decree"
import * as admin from "firebase-admin";
import { logger } from './logger'
const firebaseLogger = logger.child({ module: 'firebase' })
const serviceAccount = require('../config/meparbot-firebase-adminsdk-59ogt-0888ba87f5.json')
const MAX_BATCH_SIZE = 500
let dbLatestCache: Decree[] = []

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://meparbot.firebaseio.com"
});

const db = admin.firestore()

const getSubscribers = async (): Promise<User[]> => {
  const users = await db.collection('users').get()
  firebaseLogger.info(`got ${users.size} users`)
  if (users.empty) {
    firebaseLogger.error('No users in base')
    return [];
  }
  let result = []
  users.forEach(doc => {
    result.push(doc.data())
  })
  return result
}

const SubscribeUser = async (user: User): Promise<string> => {

  const firebaseLogger = logger.child({ module: 'firebase', chatId: user.chatId, username: user.username })

  const userRef = db.collection('users').doc(user.chatId.toString())

  const doc = await userRef.get();
  if (doc.exists) {
    firebaseLogger.trace({ msg: `Already subscribed` })
    return `@${user.username} already subscribed`
  }
  await userRef.set(user).catch((e: Error) => {
    firebaseLogger.error({ msg: `Error while subscribing user: ${e.message}` })
    return '500 : Error while subscribing'
  })
  firebaseLogger.trace({ msg: `Subscribed user` })
  return `@${user.username} successfully subscribed`
}

const unSubscribeUser = async (user: User): Promise<string> => {
  const firebaseLogger = logger.child({ module: 'firebase', chatId: user.chatId, username: user.username })
  const userRef = db.collection('users').doc(user.chatId.toString())
  const doc = await userRef.get();
  if (doc.exists) {
    await userRef.delete().catch((e: Error) => {
      firebaseLogger.error({ msg: `Error while subscribing user: ${e.message}` })
      return '500 : Error while unsubscribing'
    })
    firebaseLogger.trace({ msg: `unSubscribed user` })
    return `@${user.username} not subscribed`
  }
  firebaseLogger.trace({ msg: `Not subscribed` })
  return `@${user.username} successfully unsubscribed`
}


const addDecrees = async (decrees: Decree[]): Promise<string> => {

  let arrOfArr: Array<Decree[]> = []
  for (let i = 0; i < decrees.length / MAX_BATCH_SIZE; i++) {
    if ((i + 1) * MAX_BATCH_SIZE < decrees.length) {
      arrOfArr.push(decrees.slice(i * MAX_BATCH_SIZE, (i + 1) * MAX_BATCH_SIZE))
    } else {
      arrOfArr.push(decrees.slice(i * MAX_BATCH_SIZE))
    }
  }
  try {
    const batchPromice = arrOfArr.map((decrees) => {
      commitBatch(decrees)
    })
    await Promise.all(batchPromice)
    return 'Updated'
  } catch (e) {
    firebaseLogger.error(e.message)
    return 'Failure'
  }
}

function getDecreeID(decree: Decree): string {
  return decree?.url?.slice(8).split('/').join('.')
}

async function commitBatch(decrees: Decree[]): Promise<void> {
  if (decrees.length > MAX_BATCH_SIZE) {
    firebaseLogger.error(`Batch size ${decrees.length} is more than maximum ${MAX_BATCH_SIZE} allowed`)
    new Error(`Batch size ${decrees.length} is more than maximum ${MAX_BATCH_SIZE} allowed`)
  }
  try {
    const batch = db.batch()
    decrees.forEach((decree: Decree) => {
      const decreeRef = db.collection('decrees').doc(getDecreeID(decree))
      batch.set(decreeRef, decree);
    })
    firebaseLogger.trace(`Commiting batch set of ${decrees.length} decrees`)
    await batch.commit();
  } catch (e) {
    firebaseLogger.error(e.message)
  }
  dbLatestCache = await updateCache()
}
export const query = db.collection('decrees').orderBy('date', 'desc').limit(50)

const dbLatest = async (quantity: number = 50): Promise<Decree[]> => {
  if (dbLatestCache.length != 0) {
    firebaseLogger.trace(`Get ${dbLatestCache.length} decrees from cache`)
    return dbLatestCache
  }
  return getFromDB(quantity)
}

const updateCache = async () => {
  firebaseLogger.trace(`Updating cache`)
  return await getFromDB()
}
const getFromDB = async (quantity: number = 50) => {
  const snapshot = await db.collection('decrees').orderBy('date', 'desc').limit(quantity).get()
  firebaseLogger.trace(`Got snapshot with ${snapshot.size} docs form base`)
  if (snapshot.empty) {
    firebaseLogger.error('No Decrees in base')
    return [];
  }
  let result = []
  snapshot.forEach(doc => {
    const converted = converToDecrees(doc.data())
    result.push(converted)
  })
  dbLatestCache = result
  firebaseLogger.trace(`Converted ${result.length} docs to decrees. Cache updated`)
  return result
}

function converToDecrees(docData: FirebaseFirestore.DocumentData) {
  return {
    url: docData.url,
    title: docData.title,
    date: docData.date.toDate(),
    number: docData.number,
    text: docData.text
  }
}

export { SubscribeUser, unSubscribeUser, addDecrees, dbLatest, getSubscribers }