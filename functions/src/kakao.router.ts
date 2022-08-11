import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import * as express from "express";
import axios from "axios";
import { CreateRequest } from "firebase-admin/lib/auth/auth-config";
import { Response } from "express-serve-static-core";
import { UserRecord } from "firebase-admin/lib/auth/user-record";
import * as url from "url";

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
    console.log(`Returning firebase token to user: ${firebaseToken}`);
    return res.send({ firebase_token: firebaseToken });
  });
});

router.post("/logout", async (req, res) => {
  try {
    const target_id = req.body.kakaoUID; // 2270924324
    if (!target_id) return res.status(400).send({ error: "There is no id." });
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
          Authorization: `KakaoAK ${functions.config().kakao.kakao_admin_key}`,
          "content-type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("result.data : ", result.data);
    return res.send(result.data);
    // return result;
  } catch (error: any) {
    console.log("error.data: ", error.data);
    return res
      .status(500)
      .send({ message: "로그아웃 처리 중 서버에서 오류 발생!" });
  }
});

export default router;

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
 * @param  {String} userId        user id per app
 * @param  {String} email         user's email address
 * @param  {String} displayName   user
 * @param  {String} photoURL      profile photo url
 * @return {Prommise<UserRecord>} Firebase user record in a promise
 */
function updateOrCreateUser(
  userId: string,
  email: string,
  displayName: string,
  photoURL: string
) {
  console.log("updating or creating a firebase user");
  const updateParams: CreateRequest & { provider: string } = {
    provider: "KAKAO",
    displayName: displayName,
    photoURL: undefined,
  };
  if (displayName) {
    updateParams["displayName"] = displayName;
  } else {
    updateParams["displayName"] = email;
  }
  if (photoURL) {
    updateParams["photoURL"] = photoURL;
  }
  console.log(updateParams);
  return firebaseAdmin
    .auth()
    .updateUser(userId, updateParams)
    .catch((error) => {
      if (error.code === "auth/user-not-found") {
        updateParams["uid"] = userId;
        if (email) {
          updateParams["email"] = email;
        }
        return firebaseAdmin.auth().createUser(updateParams);
      }
      throw error;
    });
}

/**
 * createFirebaseToken - returns Firebase token using Firebase Admin SDK
 *
 * @param  {String} kakaoAccessToken          access token from Kakao Login API
 * @param  {Response} res                     express response
 * @return {Promise<String>}                  Firebase token in a promise
 */
function createFirebaseToken(
  kakaoAccessToken: string,
  res: Response<any, Record<string, any>, number>
) {
  return requestMe(kakaoAccessToken)
    .then((response) => {
      const body = response.data;
      console.log(body);
      const userId = `kakao:${body.id}`;
      if (!userId) {
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
      return updateOrCreateUser(
        userId,
        body.kaccount_email,
        nickname,
        profileImage
      );
    })
    .then((userRecord: UserRecord) => {
      const userId = userRecord.uid;
      console.log(`creating a custom firebase token based on uid ${userId}`);
      return firebaseAdmin
        .auth()
        .createCustomToken(userId, { provider: "KAKAO" });
    });
}