import { Router } from 'express';
import { 
  registerAdmin,
  loginAdmin,
  getAllDeliveryRiders,
  getDeliveryRiderById,
  assignDeliveryRider,
  assignLocation,
  logout,
  refreshAccessToken
} from '../controllers/admin.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Authentication routes
router.route('/register').post(registerAdmin);
router.route('/login').post(loginAdmin);
router.route('/logout').post(isAuthenticated, isAdmin, logout);
router.route('/refresh-token').post(refreshAccessToken);

// Delivery rider management
router.route('/riders').get(isAuthenticated, isAdmin, getAllDeliveryRiders);
router.route('/riders/:riderId').get(isAuthenticated, isAdmin, getDeliveryRiderById);
router.route('/riders/:riderId/assign').post(isAuthenticated, isAdmin, assignDeliveryRider);
router.route('/riders/:riderId/location').post(isAuthenticated, isAdmin, assignLocation);


export default router;