import { User } from "../types/User";
import { Decree } from "../types/Decree"
import * as admin from "firebase-admin";
import { logger } from './logger'
const firebaseLogger = logger.child({ module: 'firebase' })
const serviceAccount = require('../config/meparbot-firebase-adminsdk-59ogt-0888ba87f5.json')
const MAX_BATCH_SIZE = 500

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
}
export const query = db.collection('decrees').orderBy('date', 'desc').limit(50)

const dbLatest = async (quantity: number = 50): Promise<Decree[]> => {
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
  firebaseLogger.trace(`Converted ${result.length} docs to decrees`)
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

export { SubscribeUser, addDecrees, dbLatest, getSubscribers }