import * as functions from "firebase-functions";

import * as admin from "firebase-admin";
import * as express from "express";

import kakaoRouter from "./kakaoRouter";

admin.initializeApp(); // 어드민 초기화. 클라우드 함수, 호스팅만 사용할 경우 따로 설정파일을 넘겨주지 않아도 됨
const app = express();

app.use(express.json()); // body-parser 설정
app.use("/kakao", kakaoRouter);


export const api = functions.region("asia-northeast3").https.onRequest(app);


// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
