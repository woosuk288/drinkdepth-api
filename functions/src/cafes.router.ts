import * as functions from "firebase-functions";
// import * as firebaseAdmin from "firebase-admin";
import * as express from "express";
// import axios from "axios";
// import { CreateRequest } from "firebase-admin/lib/auth/auth-config";
// import { Response } from "express-serve-static-core";
// import { UserRecord } from "firebase-admin/lib/auth/user-record";
// import * as url from "url";
import { CAFES, MENUES } from "./constants";
import { db } from "./db";

const router = express.Router();

router.get("/", async (req, res) => {
  const q = await db.collection(CAFES).get();
  const cafes = q.docs.map((doc) => doc.data());

  functions.logger.info("Hello cafes!", cafes.length);
  res.status(200).send(cafes);
});

router.get("/:cafe_id", async (req, res) => {
  const snap = await db.collection(CAFES).doc(req.params.cafe_id).get();

  functions.logger.info("Hello cafe!", snap.exists);
  res.status(200).send(snap.data());
});

// router.post("/:cafe_id", async (req, res) => {
//   console.log("req.headers.authorization : ", req.headers.authorization);
//   console.log("server.key : ", functions.config().server.key);
//   if (req.headers.authorization !== functions.config().server.key) {
//     res.status(403).send("제한된 요청입니다.");
//     return;
//   }

//   const cafe = req.body;
//   const cafeId = req.params.cafe_id;
//   if (cafeId !== cafe.id) {
//     res.status(401).send("잘못된 요청입니다.");
//     return;
//   }

//   await db.collection(CAFES).doc(cafeId).set(cafe);

//   functions.logger.info("Hello post cafe!", cafe);
//   res.status(200).send(cafe);
// });

router.get("/:any/all_menus", async (req, res) => {
  const q = await db.collectionGroup(MENUES).get();
  const menus = q.docs.map((doc) => doc.data());

  functions.logger.info("Hello all_menus!", menus.length);
  res.status(200).send(menus);
});

router.get("/:cafe_id/menus", async (req, res) => {
  const cafeId = req.params.cafe_id;
  if (!cafeId) {
    res.status(401).send("잘못된 요청입니다.");
    return;
  }

  const q = await db.collection(CAFES).doc(cafeId).collection(MENUES).get();
  const menus = q.docs.map((doc) => doc.data());

  functions.logger.info("Hello menus!", menus.length);
  res.status(200).send(menus);
});

// router.post("/:cafe_id/menus", async (req, res) => {
//   console.log("req.headers.authorization : ", req.headers.authorization);
//   console.log("server.key : ", functions.config().server.key);
//   if (req.headers.authorization !== functions.config().server.key) {
//     res.status(403).send("제한된 요청입니다.");
//     return;
//   }

//   const cafeId = req.params.cafe_id;
//   const menus = req.body;

//   const batch = db.batch();

//   menus.forEach((menu) => {
//     const docRef = db
//       .collection(CAFES)
//       .doc(cafeId)
//       .collection(MENUES)
//       .doc(menu.id);
//     batch.set(docRef, menu);
//   });

//   const result = await batch.commit();

//   res.status(200).send(`Hello create /menus function! ${result.length}`);
// });

router.get("/:cafe_id/pairing_menus/:menu_ids", async (req, res) => {
  console.log("req.params : ", req.params);
  const { cafe_id, menu_ids } = req.params;
  if (!cafe_id || !menu_ids) {
    res.status(401).send("잘못된 요청입니다.");
    return;
  }

  const menuIds = menu_ids.split(",");

  const snaps = await Promise.all(
    menuIds.map((menuId) => {
      return db
        .collection(CAFES)
        .doc(cafe_id)
        .collection(MENUES)
        .doc(menuId)
        .get();
    })
  );

  const pairingMenus = snaps.map((snap) => snap.data());

  functions.logger.info("Hello pairing_menus! ", pairingMenus.length);
  res.status(200).send(pairingMenus);
});

router.get("/:cafe_id/menus/:menu_id", async (req, res) => {
  const { cafe_id, menu_id } = req.params;
  if (!cafe_id || !menu_id) {
    res.status(401).send("잘못된 요청입니다.");
    return;
  }
  const snap = await db
    .collection(CAFES)
    .doc(cafe_id)
    .collection(MENUES)
    .doc(menu_id)
    .get();

  functions.logger.info("Hello menu! ", snap.exists);
  res.status(200).send(snap.data());
});

export default router;
