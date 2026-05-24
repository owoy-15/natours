const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      required: [true, 'Review must have a rating!'],
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // Reference to the tour that this review belongs to, and the user that wrote this review
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!'],
    },
  },

  { toJson: { virtuals: true }, toObject: { virtuals: true } } // options for the schema, to include virtual properties when outputing the data as JSON or as a JavaScript object
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // Create a compound index on tour and user fields to ensure that each user can only write one review per tour

// reviewSchema.pre(/^find/, function (next) {
//   this.populate({ path: 'tour', select: 'name' }).populate({
//     path: 'user',
//     select: 'name photo',
//   });
//   next();
// });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      // tour is the field in the review model that references the tour that this review belongs to, so we can use it to filter reviews by tour ID
      $match: { tour: tourId }, // Match reviews for the specified tour ID
    },
    {
      $group: {
        // tour (id) in review model
        _id: '$tour', // Group by tour ID
        nRating: { $sum: 1 }, // Count the number of ratings
        avgRating: { $avg: '$rating' }, // Calculate the average rating
      },
    },
  ]);

  // Update the tour document with the calculated average rating and ratings quantity
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating, // Update the ratings quantity for the tour
      ratingsAverage: stats[0].avgRating, // Update the average rating for the tour
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0, // Set ratings quantity to 0 if there are no reviews
      ratingsAverage: 4.5, // Set default average rating to 4.5 if there are no reviews
    });
  }
};

// use POST middleware to calculate average ratings after a new review is created, and this middleware will only run after the review is saved to the database, so we can be sure that the review has an ID and can be used to calculate the average ratings for the tour that this review belongs to
reviewSchema.post('save', function () {
  // this points to the current review document
  // this.constructor points to the model that created this document, which is the Review model, so we can use it to call the static method calcAverageRatings, and pass the tour ID
  this.constructor.calcAverageRatings(this.tour); // Call the static method to calculate average ratings for the tour that this review belongs to, and pass the tour ID as an argument
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Return Review document
  this.r = await this.findOne(); // Execute the query to get the document that is being updated or deleted, and store it in the review document (this) for later use in the post middleware
});

reviewSchema.post(/^findOneAnd/, async function () {
  //   console.log(this.r.constructor); this line return Review Model
  //  this.r = await this.findOne(); // Does not work here
  await this.r.constructor.calcAverageRatings(this.r.tour); // Call the static method to calculate average ratings for the tour that this review belongs to, and pass the tour ID as an argument, and this.r is the review document that we stored in the pre middleware
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
