const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

// create a new router instance for review like sub-routes
// mergeParams: true is used to merge the parameters from the parent router (tourRoute) to the child router (reviewRoute), so that we can access the tourId parameter in the reviewController
const router = express.Router();

router.use(authController.protect);

router.get(
  '/checkout-session/:tourId',
  authController.protect,
  bookingController.getCheckoutSession
);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
