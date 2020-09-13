import * as admin from "firebase-admin";
const serviceAccount = require('../../config/meparbot-firebase-adminsdk-59ogt-0888ba87f5.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://meparbot.firebaseio.com"
});

const db = admin.firestore();
const docRef = db.collection('users').doc('subsciber');

const SubscribeUser = async (chatId: number) => {
  await docRef.set({
    chatId: chatId
  }).catch((e: Error) => console.log(e.message))
}

exports.SubscribeUser = SubscribeUser