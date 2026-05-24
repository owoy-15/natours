const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

// const reviewController = require('../controllers/reviewController');

const reviewRouter = require('./reviewRoute'); // Import the review routes

// create a new router instance for tour like sub-routes
const router = express.Router();

// Middleware is a function that runs before the route handler
// Param middleware is middleware that only runs when we have a certain parameter in our URL.(Local middleware) if use on app is global middleware
// router.param('id', tourController.checkId);

// Mount the review router on the tour router
router.use('/:tourId/reviews', reviewRouter); // Mount the review router on the tour router, so that all routes that start with /api/v1/tours/:tourId/reviews will be handled by the review router

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// /tours-within/233/center/-40,45/unit/mi
// /tours-distances?distance=233&center=-40,45&unit=mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// Act like middleware, it will handle all requests that start with /api/v1/tours
router
  .route('/')
  .get(tourController.getAllTours)
  // Middle to check if body contains the name and price property
  // .post([m1, m2, ...], handler)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

module.exports = router;
