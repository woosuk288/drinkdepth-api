import * as functions from "firebase-functions";
import * as express from "express";
import { REVIEWS } from "./constants";

import { firestore } from "firebase-admin";

const router = express.Router();

router.get("/:review_id", async (req, res) => {
  try {
    const id = req.params.review_id;
    console.log("id : ", id);

    const snap = await firestore().collection(REVIEWS).doc(id).get();
    const data = snap.data();

    functions.logger.info("Hello get review!", { data });
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/:review_id", async (req, res) => {
  try {
    const id = req.params.review_id;
    const data = req.body;
    await firestore().collection(REVIEWS).doc(id).set(data);

    functions.logger.info("Hello post review!", { data });
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/", async (req, res) => {
  try {
    const q = await firestore().collection(REVIEWS).get();
    const reviews = q.docs.map((doc) => doc.data());

    functions.logger.info("Hello get reviews!", { length: q.size });
    res.status(200).send(reviews);
  } catch (error) {
    res.status(500).send(error);
  }
});

export default router;
