import { tMessage } from "../types/Query";
import { User } from "../types/User";
import * as admin from "firebase-admin";
import { logger } from './logger'
const firebaseLogger = logger.child({ module: 'firebase' })


const serviceAccount = require('../../config/meparbot-firebase-adminsdk-59ogt-0888ba87f5.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://meparbot.firebaseio.com"
});

const db = admin.firestore()

const SubscribeUser = async (msg: tMessage): Promise<string> => {
  const userRef = db.collection('users').doc(msg.chat.id.toString())
  const user: User = {
    chatId: msg.chat.id,
    username: msg.chat.username,
    name: msg.chat.first_name + ' ' + msg.chat.last_name
  }

  await userRef.set(user).catch((e: Error) => {
    firebaseLogger.error({ msg: `Error while subscribing user: ${e.message}`, chatId: user.chatId, username: user.username })
    return '500 : Error while subscribing'
  })
  firebaseLogger.info({ msg: `Subscribed user`, chatId: user.chatId, username: user.username })
  return `@${msg.chat.username} successfully subscribed`
}

export { SubscribeUser }