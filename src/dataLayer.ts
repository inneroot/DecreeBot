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

const SubscribeUser = async (user: User): Promise<string> => {

  const firebaseLogger = logger.child({ module: 'firebase', chatId: user.chatId, username: user.username })

  const userRef = db.collection('users').doc(user.chatId.toString())

  const doc = await userRef.get();
  if (doc.exists) {
    firebaseLogger.info({ msg: `Already subscribed` })
    return `@${user.username} already subscribed`
  }
  await userRef.set(user).catch((e: Error) => {
    firebaseLogger.error({ msg: `Error while subscribing user: ${e.message}` })
    return '500 : Error while subscribing'
  })
  firebaseLogger.info({ msg: `Subscribed user` })
  return `@${user.username} successfully subscribed`
}


const addDecrees = async (decrees: Array<Decree>): Promise<string> => {

  let arrOfArr: Array<Array<Decree>> = []
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

async function commitBatch(decrees: Array<Decree>): Promise<void> {
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
    firebaseLogger.info(`Commiting batch set of ${decrees.length} decrees`)
    await batch.commit();
  } catch (e) {
    firebaseLogger.error(e.message)
  }
}

export { SubscribeUser, addDecrees }