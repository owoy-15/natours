const multer = require('multer');
const sharp = require('sharp');
// const fs = require('fs'); // file system module
const Tour = require('../models/tourModel'); // Import the Tour model
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Test Datas
// // top level code run only once when the server starts
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`, 'utf-8')
// ); // read file and parse it to JSON

const multerStorage = multer.memoryStorage(); // Store as a buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image! Please upload only image.', 400), false);
  }
};
// Upload Image to the file system
// and in db we put the link to that image
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  {
    name: 'images',
    maxCount: 3,
  },
]);

exports.resizeTourImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1. Cover image
  // Put it on req.body cuz it need to use it in the update tour
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({
      quality: 90, // 90%
    })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2. Images
  req.body.images = [];
  // await all the result and go to the next middleware
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({
          quality: 90, // 90%
        })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
};

// Custom Middleware
// Middleware for prefilling parts of the query object before we then reach the getAllTours handler.
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price,-ratingsAverage';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// Example of using catchAsync - so i can know req, res, next are passed in
// exports.getAllTours = (req, res, next) => fn(req, res, next).catch(next(err));
exports.getAllTours = factory.getAll(Tour); // Use the getAll factory function to create the getAllTours controller, so that we can reuse the same code for other models as well, and also make our code more concise and cleaner

exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // Use the getOne factory function to create the getTour controller, so that we can reuse the same code for other models as well, and also make our code more concise and cleaner

// exports.getTour = catchAsync(async (req, res, next) => {
//   const id = req.params.id; // Get the ID from the request parameters
//   // Find the tour by ID using Mongoose
//   const tour = await Tour.findById(id).populate('reviews');

//   // const tour = Tour.findOne({_id: id});

//   if (!tour) {
//     // Jump to the global error handling middleware
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({ status: 'success', data: { tour } });

//   // try {

//   // } catch (error) {
//   //   console.error('Error fetching tour:', error);
//   //   return res.status(400).json({ status: 'fail', message: error.message });
//   // }
// });

exports.createTour = factory.createOne(Tour); // Use the createOne factory function to create the createTour controller, so that we can reuse the same code for other models as well, and also make our code more concise and cleaner

// exports.createTour = catchAsync(async (req, res, next) => {
//   // Create a new tour document using the Tour model
//   const newTour = await Tour.create(req.body);

//   return res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour, // Return the created tour
//     },
//   });

//   // try {
//   // } catch (error) {
//   //   console.error('Error creating tour:', error);
//   //   return res.status(400).json({ status: 'fail', message: error.message });
//   // }
// });

exports.updateTour = factory.updateOne(Tour); // Use the updateOne factory function to create the updateTour controller, so that we can reuse the same code for other models as well, and also make our code more concise and cleaner

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // Update the tour by ID using Mongoose
//   const updatedTour = await Tour.findByIdAndUpdate(
//     req.params.id, // Get the ID from the request parameters
//     req.body, // The data to update
//     {
//       new: true, // Return the updated document
//       runValidators: true, // Run schema validators
//     }
//   );

//   if (!updatedTour) {
//     // Jump to the global error handling middleware
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   return res.status(201).json({
//     status: 'success',
//     data: {
//       tour: updatedTour, // Return the created tour
//     },
//   });

//   // try {
//   // } catch (error) {
//   //   console.error('Error creating tour:', error);
//   //   return res.status(400).json({ status: 'fail', message: error.message });
//   // }
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // Update the tour by ID using Mongoose
//   const tour = await Tour.findByIdAndDelete(
//     req.params.id // Get the ID from the request parameters
//   );

//   if (!tour) {
//     // Jump to the global error handling middleware
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null, // 204 mean No content to return
//   });
// });

exports.deleteTour = factory.deleteOne(Tour); // Use the deleteOne factory function to create the deleteTour controller, so that we can reuse the same code for other models as well, and also make our code more concise and cleaner

//  Get tour's statistics
exports.getTourStats = catchAsync(async (req, res, next) => {
  // Aggregation pipeline is a MongoDB feature But Mongoose, of course, gives us access to it,  so that we can use it in the Mongoose driver
  // pass in an array of so-called stages
  const stats = await Tour.aggregate([
    {
      // Filters tours with ratingsAverage >= 4.5
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    // caculate average of ratingsAverage
    {
      $group: {
        // put null to have everything in one group so that we can calculate the statistics for all of the tours together and not separate it by groups
        // _id: null,
        _id: { $toUpper: '$difficulty' }, // turn the field's name to uppercase
        // for each of the document that's gonna go through this pipeline, one will be added to this numTours counter.
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: -1 }, // 1 for ascending
    },
    // {
    //   // excluding all EASY ($ne - not equal)
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  return res.status(200).json({
    status: 'success',
    data: {
      stats, // Return the created tour
    },
  });

  // try {
  // } catch (error) {
  //   console.error("Error getting tours's statistics:", error);
  //   return res.status(400).json({ status: 'fail', message: error.message });
  // }
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = Number(req.params.year);

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // Deconstructs the startDates array field from the input documents to output a document for each element
    },
    {
      // Filters documents to only include those with startDates within the specified year
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // Group by the month of the startDates as number 1-12
        numTourStarts: { $sum: 1 }, // Count the number of tour starts in each month
        tours: { $push: '$name' }, // Create an array of tour names for each month
      },
    },
    {
      $addFields: { month: '$_id' }, // Add a new field 'month' with the value of '_id' in each document
    },
    {
      $project: {
        _id: 0, // Exclude the '_id' field from the output documents
      },
    },
    {
      $sort: { numTourStarts: -1 }, // Sort by number of tour starts in descending order
    },
    {
      $limit: 12, // Limit the results to 12 documents (months)
    },
  ]);

  return res.status(200).json({
    status: 'success',
    count: plan.length,
    data: {
      plan, // Return the created  tour
    },
  });

  // try {

  // } catch (error) {
  //   console.error("Error getting tours's monthly plan", error);
  //   return res.status(400).json({ status: 'fail', message: error.message });
  // }
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/12.352305, 103.770978/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // Convert distance to radians

  // geospatial query to find tours within a certain distance from a given point (latitude and longitude), and the distance is converted to radians based on the unit (miles or kilometers) using the radius of the Earth (3963.2 miles or 6378.1 kilometers). The resulting tours are then returned in the response. Note that this code assumes that the Tour model has a geospatial index on the startLocation field, which is necessary for efficient geospatial queries.
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  }); // Find tours within a certain distance from a given point (latitude and longitude) using geospatial query

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // Convert distance to miles or kilometers

  // geospatial aggregation to calculate distances from a given point (latitude and longitude) to all tours in the database, and the distances are returned in the response. Note that this code assumes that the Tour model has a geospatial index on the startLocation field, which is necessary for efficient geospatial queries.
  const distances = await Tour.aggregate([
    {
      // Need at least one field with geospatial index to use $geoNear, and it must be the first stage in the pipeline
      $geoNear: {
        // The point from which to calculate distances, specified as a GeoJSON object with type "Point" and coordinates [longitude, latitude]. The coordinates are parsed from the latlng parameter in the request URL.
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distance', // The name of the field in the output documents that will contain the calculated distance
        distanceMultiplier: multiplier, // Convert distance to kilometers
      },
    },
    {
      $project: {
        distance: 1, // Include the distance field in the output documents
        name: 1, // Include the name field in the output documents
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
