import * as admin from "firebase-admin";
import * as serviceAccount from "./serviceAccount.json";

admin.initializeApp({
  credential: admin.credential.cert(<admin.ServiceAccount>serviceAccount),
});

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
// export const
