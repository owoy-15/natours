const Review = require('../models/reviewModel');
// const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// Middleware
exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId; // If the tour ID is not provided in the request body, set it to the tour ID from the request parameters
  if (!req.body.user) req.body.user = req.user.id; // If the user ID is not provided in the request body, set it to the user ID from the authenticated user (req.user is set by the authController.protect middleware)
  next();
};

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);

// exports.getReview = catchAsync(async (req, res, next) => {
//   const id = req.params.id; // Get the ID from the request parameters
//   // Find the review by ID using Mongoose
//   const review = await Review.findById(id);

//   if (!review) {
//     // Jump to the global error handling middleware
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(200).json({ status: 'success', data: { review } });
// });

// exports.updateReview = catchAsync(async (req, res, next) => {
//   const id = req.params.id; // Get the ID from the request parameters
//   // Update the review by ID using Mongoose
//   const review = await Review.findByIdAndUpdate(id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!review) {
//     // Jump to the global error handling middleware
//     return next(new AppError('No review found with that ID', 404));
//   }

//   res.status(200).json({ status: 'success', data: { review } });
// });
