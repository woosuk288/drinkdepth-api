import * as functions from "firebase-functions";
import * as express from "express";
import { CAFES, MENUES } from "./constants";
import { db /* , FieldValue */ } from "./db";

import * as path from "path";
import * as fs from "fs";
import { auth } from "firebase-admin";

const router = express.Router();

router.get("/cafes", async (req, res) => {
  const batch = db.batch();
  testCafes.forEach((cafe) => {
    const { id, ...data } = cafe;
    const docRef = db.collection(CAFES).doc(cafe.id);
    batch.set(docRef, { ...data, createdAt: new Date() });
  });

  const result = await batch.commit();

  functions.logger.info("/test/cafes", { dataLength: result.length });
  res.status(200).send(`Hello /test/cafes function!`);
});

router.post("/menus/files", async (req, res) => {
  const batch = db.batch();

  const cafeId = "babacarmel";

  //
  const data = await fs.readFileSync(
    path.join(process.cwd(), `${MENUES}.db`),
    "utf-8"
  );
  const menus = JSON.parse(data as unknown as string);

  menus.forEach((menu) => {
    const { id, ...data } = menu;
    const docRef = db.collection(CAFES).doc(cafeId).collection(MENUES).doc(id);
    batch.set(docRef, { ...data, createdAt: new Date(data.createdAt) });
    // batch.set(docRef, data);
    // batch.update(docRef, { commentCount: FieldValue.delete() });
  });

  await batch.commit();

  // const query = await db.collection(CAFES).doc(cafeId).collection(MENUES).get();
  // const menus = query.docs.map((doc) => ({
  //   ...doc.data(),
  //   id: doc.id,
  //   createdAt: doc.data().createdAt.toDate().toISOString(),
  // }));

  // fs.writeFileSync(
  //   path.join(process.cwd(), `${MENUES}.db`),
  //   JSON.stringify(menus)
  // );

  functions.logger.info("Hello /menus logs!", { dataLength: menus.length });

  res.status(200).send(`Hello /menus function!`);
});

router.get("/images", async (req, res) => {
  const cafeId = "babacarmel";
  const query = await db
    .collection(CAFES)
    .doc(cafeId)
    .collection(MENUES)
    .where("category", "==", "디저트")
    .get();

  const batch = db.batch();
  query.forEach((doc) => {
    batch.update(doc.ref, { imageURL: "/images/logo_icon.png" });
  });

  const result = await batch.commit();

  functions.logger.info("Hello /images logs!", { dataLength: result.length });

  res.status(200).send(`Hello /images function!`);
});

export default router;

/**
 * 커스텀 클레임 설정
 */

router.post("/claims", async (req, res) => {
  // Set admin privilege on the user corresponding to uid.

  const uid = "kakao:2336824408";

  // const customUserClaims = { admin: true };
  // await auth().setCustomUserClaims(uid, customUserClaims);

  const userRecord = await auth().getUser(uid);
  console.log("userRecord.customClaims : ", userRecord.customClaims);
  // const currentCustomClaims = userRecord.customClaims;

  // if (currentCustomClaims['admin']) {
  //   // Add level.
  //   currentCustomClaims['accessLevel'] = 10;
  //   // Add custom claims for additional privileges.
  //   return auth().setCustomUserClaims(uid, currentCustomClaims);
  // }

  res.status(200).send(`Hello create /claims function!`);
});

router.post("/menus", async (req, res) => {
  const menus = req.body;

  const batch = db.batch();

  const cafeId = "babacarmel";

  menus.forEach((menu) => {
    const { id, ...data } = menu;
    const docRef = db.collection(CAFES).doc(cafeId).collection(MENUES).doc(id);
    batch.set(docRef, { ...data, createdAt: new Date(data.createdAt) });
  });

  const result = await batch.commit();

  res.status(200).send(`Hello create /menus function! ${result.length}`);
});

router.get("/menus", async (req, res) => {
  const cafeId = "babacarmel";

  const q = await db.collection(CAFES).doc(cafeId).collection(MENUES).get();

  const result = q.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    createdAt: doc.data().createdAt.toDate(),
  }));

  res.status(200).send(result);
});

router.get("/menu/:menuId", async (req, res) => {
  const cafeId = "babacarmel";

  const menuDoc = await db
    .collection(CAFES)
    .doc(cafeId)
    .collection(MENUES)
    .doc(req.params.menuId)
    .get();

  const result = {
    ...menuDoc.data(),
    id: menuDoc.id,
    createdAt: menuDoc.data().createdAt.toDate(),
  };

  res.status(200).send(result);
});

const testCafes = [
  {
    id: "babacarmel",
    name: "바바카멜",
    imageURL:
      "https://search.pstatic.net/common/?autoRotate=true&quality=95&type=w750&src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20211021_259%2F1634788006349s8KvS_JPEG%2FKakaoTalk_20211020_181656262.jpg",
    introduce: `※ 카페 바바카멜은 안산 플라워&로스터리 카페입니다.
      엄선된 생두와 특별한 공법으로 로스팅한 바바카멜만의 싱글오리진 원두로 내린 필터커피와 제대로 된 에스프레소를 즐겨보세요.

      ※ 그동안 쉽게 맛보기 힘들었던 두종류의 게이샤 커피를 처음으로 선보입니다.

      ※ 애견동반은 테라스(도그파킹) 이용은 언제든 가능하며, 유모차나 케이지, 슬링백안에 있을 경우 매장 이용도 가능합니다. 단, 매장안에 내려놓으시면 안됩니다.

      ※꽃바구니나 꽃다발 예약 가능하며, 매장내에서 소량의 꽃 구입도 가능합니다. 손님이 많으실 경우 포장에 조금 시간이 걸릴 수 있으니 미리 예약하시기를 권장합니다.

      ※주차는 매장 건너편 무료 공원주차장을 이용하시거나, 매장 뒷편 이면도로와 공원옆 이면도로 주차장을 이용하시면 됩니다.

      ※매장 뿐 아니라 온라인에서도 꽃과 커피의 향미를 통해 지친 현대인에게 느려도 되는 순간들, 여유로운 순간들을 지켜주는 존재로 일상의 행복을 담아 보냅니다.`,
    address: "경기 안산시 상록구 충장로 8 1층",
    addressY: "37.2825273384935",
    addressX: "126.855799779277",
    addressETC: "",
    // addressETC: '3호선 경복궁역 7번 출구에서273m',
  },
];
