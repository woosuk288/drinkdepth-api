import * as functions from "firebase-functions";

// import * as admin from "firebase-admin";
import * as express from "express";
// import * as serviceAccount from "./serviceAccount.json";
import * as cors from "cors";

import kakaoRouter from "./kakao.router";
import cafesRouter from "./cafes.router";
// import testRouter from "./test.router";

// 어드민 초기화. 클라우드 함수, 호스팅만 사용할 경우 따로 설정파일을 넘겨주지 않아도 됨
// 커스텀 인증(kakao 처리용) 사용하므로 serviceAccount 필요
// admin.initializeApp({
//   credential: admin.credential.cert(<admin.ServiceAccount>serviceAccount),
// });
require("./db");

const app = express();

const whitelist = [
  "http://localhost:3010",
  "https://drinkdepth.com",
  "https://stage.drinkdepth.com",
  "https://www.drinkdepth.com",
  "https://offlineqr.drinkdepth.com",
  "https://offlineqrtablet.drinkdepth.com",
  "localhost:5001", // local emulator
  "localhost:5000",
  "asia-northeast3-drinkdepth.cloudfunctions.net", // production build
];
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // console.log("origin~~ : ", origin);
    if (whitelist.indexOf(origin ?? "") !== -1) {
      callback(null, true); // cors 허용
    } else {
      functions.logger.info("Not allowed origin~~ : ", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(express.json()); // body-parser 설정
app.use(function (req, res, next) {
  req.headers.origin = req.headers.origin || req.headers.host;
  next();
});
app.use(cors(corsOptions));
app.use("/kakao", kakaoRouter);
app.use("/cafes", cafesRouter);
// TODO: app.use("/owner", ownerRouter);
// app.use("/test", testRouter);

export const api = functions.region("asia-northeast3").https.onRequest(app);
