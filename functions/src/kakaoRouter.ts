import * as express from "express";
const router = express.Router();


router.get("/", async (req, res) => {
  res.status(200).send("Hello cloud functions!");
});

router.get("/hello", async (req, res) => {
  res.status(200).send({"id": "hi", "message": "hello"});
});

export default router;
