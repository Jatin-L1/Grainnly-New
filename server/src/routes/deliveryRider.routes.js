import { Router } from "express";
import { registerDeliveryRider } from "../controllers/deliveryRider.controller.js";
import { loginDeliveryRider } from "../controllers/deliveryRider.controller.js";
import { getDeliveryRider } from "../controllers/deliveryRider.controller.js";
import { getAllDeliveryRiders } from "../controllers/deliveryRider.controller.js";
import { updateLocation } from "../controllers/deliveryRider.controller.js";


const router = Router();
router.route("/register").post(registerDeliveryRider);
router.route("/login").post(loginDeliveryRider);
router.route("/get").get(getDeliveryRider);
router.route("/getAll").get(getAllDeliveryRiders);
router.route("/updateLocation").put(updateLocation);


export default router;