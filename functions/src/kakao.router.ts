import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import * as express from "express";
import axios from "axios";
import { CreateRequest } from "firebase-admin/lib/auth/auth-config";
import { Response } from "express-serve-static-core";
// import { UserRecord } from "firebase-admin/lib/auth/user-record";
import * as url from "url";
import { PROFILES, PRIVACIES, INFO, COUPONS } from "./constants";

const KAKAO = "kakao";

const router = express.Router();

router.get("/", async (req, res) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  res.status(200).send("Hello cloud functions!");
});

router.post("/verifyToken", (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res
      .status(400)
      .send({ error: "There is no token." })
      .send({ message: "Access token is a required parameter." });
  }

  console.log(`Verifying Kakao token: ${token}`);

  return createFirebaseToken(token, res).then((firebaseToken) => {
    console.log(`Returning firebase token to user: ${!!firebaseToken}`);
    return res.send({ firebase_token: firebaseToken });
  });
});

router.post("/logout", async (req, res) => {
  try {
    const uid = req.body.uid;
    console.log("uid : ", uid);
    if (!uid) return res.status(400).send({ error: "There is no id." });

    const infoSnap = await firebaseAdmin
      .firestore()
      .collection(PROFILES)
      .doc(uid)
      .collection(PRIVACIES)
      .doc(INFO)
      .get();

    if (infoSnap.exists) {
      const target_id = infoSnap.data().kakaoUID;

      console.log("target_id : ", target_id);
      const params = new url.URLSearchParams({
        target_id_type: "user_id",
        target_id,
      });

      const result = await axios.post(
        "https://kapi.kakao.com/v1/user/logout",
        params.toString(),
        {
          headers: {
            Authorization: `KakaoAK ${
              functions.config().kakao.kakao_admin_key
            }`,
            "content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("kakao logout : ", result.data);
      return res.send(result.data);
    }

    return null;
  } catch (error: any) {
    console.log("error.data: ", error.data);
    return res
      .status(500)
      .send({ message: "로그아웃 처리 중 서버에서 오류 발생!" });
  }
});

export default router;

/**
 *
 *
 *
 */

// Kakao API request url to retrieve user profile based on access token
const requestMeUrl = "https://kapi.kakao.com/v2/user/me?secure_resource=true";

/**
 * requestMe - Returns user profile from Kakao API
 *
 * @param  {String} kakaoAccessToken Access token retrieved by Kakao Login API
 * @return {Promiise<Response>}      User profile response in a promise
 */
function requestMe(kakaoAccessToken: string) {
  console.log("Requesting user profile from Kakao API server.");
  return axios.get(requestMeUrl, {
    headers: {
      Authorization: "Bearer " + kakaoAccessToken,
    },
  });
}

/**
 * updateOrCreateUser - Update Firebase user with the give email, create if
 * none exists.
 *
 * @param  {String} kakaoUID        user id per app
 * @param  {String} email         user's email address
 * @param  {String} displayName   user
 * @param  {String} photoURL      profile photo url
 * @return {Prommise<UserRecord>} Firebase user record in a promise
 */
async function updateOrCreateUser(
  kakaoUID: string,
  email: string,
  displayName: string,
  photoURL: string,
  phoneNumber: string
) {
  try {
    const q = await firebaseAdmin
      .firestore()
      .collectionGroup(PRIVACIES)
      .where("provider", "==", KAKAO)
      .where("kakaoUID", "==", kakaoUID)
      .limit(1)
      .get();

    const createParams: CreateRequest = {
      displayName,
      photoURL,
    };

    if (email) {
      createParams["email"] = email;
    }
    if (phoneNumber) {
      createParams["phoneNumber"] = phoneNumber;
    }

    if (q.size) {
      functions.logger.info("updating user...");

      const uid = q.docs[0].data().uid;

      const userRecord = await firebaseAdmin.auth().updateUser(uid, {
        email,
        phoneNumber,
        // providerToLink: createParams.providerToLink,
      });

      return userRecord;
    } else {
      functions.logger.info("creating user...");

      createParams.providerToLink = {
        ...createParams,
        providerId: KAKAO,
      };

      const userRecord = await firebaseAdmin.auth().createUser(createParams);

      await firebaseAdmin
        .firestore()
        .collection(PROFILES)
        .doc(userRecord.uid)
        .set({
          displayName,
          photoURL,
          createdAt: new Date(userRecord.metadata.creationTime),
        });

      await firebaseAdmin
        .firestore()
        .collection(PROFILES)
        .doc(userRecord.uid)
        .collection(PRIVACIES)
        .doc(INFO)
        .set({
          uid: userRecord.uid,
          email,
          phoneNumber,
          provider: KAKAO,
          kakaoUID,
        });

      await updatePreviousCoupon(userRecord.uid, kakaoUID);

      return userRecord;
    }
  } catch (error) {
    functions.logger.error(error.code);

    throw error;
  }
}

/**
 * createFirebaseToken - returns Firebase token using Firebase Admin SDK
 *
 * @param  {String} kakaoAccessToken          access token from Kakao Login API
 * @param  {Response} res                     express response
 * @return {Promise<String>}                  Firebase token in a promise
 */
async function createFirebaseToken(
  kakaoAccessToken: string,
  res: Response<any, Record<string, any>, number>
) {
  const response = await requestMe(kakaoAccessToken);

  const body = response.data;
  console.log(body);
  // const userId = `kakao:${body.id}`;
  const kakaoUID = body.id.toString();
  if (!kakaoUID) {
    res
      .status(404)
      .send({ message: "There was no user with the given access token." });
  }
  let nickname = null;
  let profileImage = null;
  if (body.properties) {
    nickname = body.properties.nickname;
    profileImage = body.properties.profile_image;
  }
  let phone_number = null;
  let email = null;
  if (body.kakao_account) {
    email = body.kakao_account.email;
    phone_number = body.kakao_account.phone_number;
  }

  const userRecord = await updateOrCreateUser(
    kakaoUID,
    email,
    nickname,
    profileImage,
    phone_number
  );

  const userId = userRecord.uid;
  console.log(`creating a custom firebase token based on uid ${userId}`);
  return firebaseAdmin.auth().createCustomToken(userId, { provider: KAKAO });
}

/**
 * 이전 데이터 수정 및 삭제 처리
 * TODO: 다 삭제되고 난 후 함수 제거
 */
async function updatePreviousCoupon(uid: string, kakaoUID: string) {
  const previousUID = "kakao:" + kakaoUID;
  const q = await firebaseAdmin
    .firestore()
    .collection(COUPONS)
    .where("customerId", "==", previousUID)
    .limit(1)
    .get();

  if (q.size > 0) {
    const batch = firebaseAdmin.firestore().batch();

    batch.update(q.docs[0].ref, { customerId: uid });
    const prevProfileRef = firebaseAdmin
      .firestore()
      .collection(PROFILES)
      .doc(kakaoUID);

    batch.delete(prevProfileRef);

    await batch.commit();

    await firebaseAdmin.auth().deleteUser(previousUID);
  }
}
