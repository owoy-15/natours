const reviewController = require('../controllers/reviewController');
const express = require('express');
const authController = require('../controllers/authController');

// create a new router instance for review like sub-routes
// mergeParams: true is used to merge the parameters from the parent router (tourRoute) to the child router (reviewRoute), so that we can access the tourId parameter in the reviewController
const router = express.Router({ mergeParams: true });

router.use(authController.protect); // Protect all routes after this middleware, so that only authenticated users can access the routes below

//  POST /api/v1/tours/:tourId/reviews
// GET /api/v1/reviews
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
