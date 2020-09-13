import { User } from "../types/User";
import * as admin from "firebase-admin";
import { logger } from './logger'


const serviceAccount = require('../../config/meparbot-firebase-adminsdk-59ogt-0888ba87f5.json');
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

export { SubscribeUser }