// Import mongoose for MongoDB connection
const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

const validator = require('validator');
const { set } = require('../app');

// Define a schema for the Tour model
// Instance of mongoose.Schema
const tourSchema = new mongoose.Schema(
  // Object that defines the structure of the documents in the collection
  {
    name: {
      type: String,
      // re1quired: true,
      // Display a custom error message if the name is not provided
      required: [true, 'A tour must have a name'], //
      unique: true, // not a validation, create a unique index in the database
      trim: true, // Remove whitespace from both ends of the string
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [3, 'A tour name must have more or equal than 10 characters'],
      // validator: [validator.isAlpha, 'Tour name must only contains charaters'], // only allow letters - return true or false
    },
    slug: String, // Slug for the tour (URL-friendly version of the name)
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
      min: [1, 'A tour must have a duration of at least 1 day'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
      min: [1, 'A tour must have a group size of at least 1 person'],
      max: [100, 'A tour must have a group size of at most 100 people'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty level'],
      // Allow only these values for difficulty
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, // Default value for rating
      min: [1, 'A tour rating must be above 1.0'],
      max: [5, 'A tour rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // Round the value to one decimal place
    },
    ratingsQuantity: {
      type: Number,
      default: 0, // Default value for rating quantity
      min: [0, 'A tour rating quantity must be above 0'],
      max: [100, 'A tour rating quantity must be below 100'],
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
      min: [0, 'A tour price must be above 0'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // Custom validation to ensure discount is less than price
        validator: function (val) {
          // 'this' refers to the current document being validated
          // this only points to current doc on NEW document creation not on Update
          return val < this.price; // Discount must be less than price
        },
        // {VALUE} will be replaced with the actual value that was provided
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true, // Remove whitespace from both ends of the string
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true, // Remove whitespace from both ends of the string
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },

    images: [String], // Array of strings for multiple images
    // images: [{ type: String, required: [true, 'Please provide an image URL'] }],
    createdAt: {
      type: Date,
      default: Date.now, // Default to current date and time
      select: false, // Exclude from query results by default
    },
    // Type Date in Mongoose is basically a wrapper around the native JavaScript Date object
    startDates: [Date], // Array of dates for tour start dates
    secretTour: {
      type: Boolean,
      default: false, // Default value for secret tour
    },
    startLocation: {
      // GeoJSON format for geospatial data
      type: {
        type: String,
        default: 'Point', // Default to 'Point' for geospatial data
        enum: ['Point'], // Only allow 'Point' as the type
      },
      coordinates: [Number], // Array of numbers for longitude and latitude
      address: String, // String for the address of the location
      description: String, // String for the description of the location
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point', // Default to 'Point' for geospatial data
          enum: ['Point'], // Only allow 'Point' as the type
        },
        coordinates: [Number], // Array of numbers for longitude and latitude
        address: String, // String for the address of the location
        description: String, // String for the description of the location
        day: Number, // Number for the day of the tour when this location is visited
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // Reference to the User model for guides
      },
    ], // Array of guide IDs (references to User model)
  },

  //for the schema Object of options
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

tourSchema.index({ price: 1, ratingsAverage: -1 }); // Compound index for price (ascending) and ratingsAverage (descending)
tourSchema.index({ slug: 1 }); // Index for slug field
tourSchema.index({ startLocation: '2dsphere' }); // Geospatial index for startLocation field

// VIRTUAL PROPERTY: duration in weeks (not stored in DB) and created when data is requested
// So help to reduce the storage space in the database
// Arrow function don't have this keyword
// Can not use in query cuz it is not in the database
// keep in the business logic
tourSchema.virtual('durationWeeks').get(function () {
  // this points to the current document
  return this.duration / 7; // Calculate duration in weeks
});

// Virtual populate: To populate the reviews for each tour without actually storing the review IDs in the tour document, and instead, we can use the review model to reference the tour model, and then use the virtual populate to populate the reviews for each tour when we query the tours
tourSchema.virtual('reviews', {
  ref: 'Review', // Reference to the Review model
  foreignField: 'tour', // The field in the Review model that references the Tour model
  localField: '_id', // The field in the Tour model that is referenced by the Review model
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create(), but not on .insertMany() or .update()
///////////////////////
// Use function() instead of arrow function to access 'this'
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Embedding guides into the tour document
// tourSchema.pre('save', async function (next) {
//   const giudesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(giudesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// // After the document is saved to the database
// // doc is the document that was saved
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE: that run before any find query
//////////////////
// All strings that start with "find" get executed by this middleware
tourSchema.pre(/^find/, function (next) {
  // this.start is a custom property you attach to the Mongoose query object to record the start time of that query.
  this.find({ secretTour: { $ne: true } }); // Exclude tours if secretTour is true
  this.start = Date.now();
  next();
});

// But find not trigger findOne, so need to add another middleware for findOne
// tourSchema.pre('findOne', function (next) {
//   // 'this' points to the current query
//   this.find({ secretTour: { $ne: true } }); // Exclude   tours
//   next();
// });

tourSchema.pre(/^find/, function (next) {
  this.populate({ path: 'guides', select: '-__v -passwordChangedAt' }); // Populate the guides field with the user data, but exclude the __v and passwordChangedAt fields from the populated data
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE: that run before any aggregate query
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   // console.log(this.pipeline()); // point to the currenct aggregation object - Tour.aggregate([...])

//   next();
// });

// QUERY MIDDLEWARE: that run before any find query
// Create a Mongoose model for the Tour
const Tour = mongoose.model('Tour', tourSchema);

// Example of how to use the Tour model to query the database
// const tour = await Tour().find()

// dafault export the Tour model
module.exports = Tour;
