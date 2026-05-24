const express = require('express');
const viewController = require('../controllers/viewController'); // Import the view controller to handle the logic for rendering the overview and tour pages
const authController = require('../controllers/authController'); // Import the auth controller to handle the logic for rendering the login page
const bookingController = require('../controllers/bookingController');
const router = express.Router();

// Not use here cuz it finds id user twice
// router.use(authController.isLoggedIn); // Middleware to check if the user is logged in, to make the user data available in the templates for conditional rendering of login/logout buttons and displaying user's name in the header

router.get(
  '/',
  bookingController.createBookingCheckout, // use it temporary
  authController.isLoggedIn,
  viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = router;
