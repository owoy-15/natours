// This line imports the Express module.
// express is a function that returns an Express application object, which is used to define your web server and API routes.
const path = require('path');
const express = require('express');
const morgan = require('morgan'); // logging middleware for development
const ratelimit = require('express-rate-limit'); // rate limiting middleware to limit the number of requests from the same IP address
const helmet = require('helmet'); // security middleware to set various HTTP headers for security
const mongoSanitize = require('express-mongo-sanitize'); // Data sanitization middleware against NoSQL query injection
const xss = require('xss-clean'); // Data sanitization middleware against XSS attacks
const cookieParser = require('cookie-parser'); // Middleware to parse cookies from the request headers
const compression = require('compression'); // Middleware

const AppError = require('./utils/appError'); // Custom error class
const globalErrorHandler = require('./controllers/errorController'); // Global error handling middleware
const tourRouter = require('./Routes/tourRoute'); // Import the tour routes
const userRouter = require('./routes/userRoute'); // Import the user routes
const reviewRouter = require('./Routes/reviewRoute'); // Import the review routes
const bookingRouter = require('./Routes/bookingRoutes'); // Import the review routes
const hpp = require('hpp'); // HTTP Parameter Pollution middleware to prevent parameter pollution attacks
const viewsRouter = require('./Routes/viewRoutes'); // Import the view routes

//////////////////////////////////////////////////////////////////////////

// This line creates an instance of the Express application.
// app now represents your web server.
// so you can access all function like to define routes, middleware, listen on a port, etc.
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug'); // Set Pug as the view engine for rendering templates
app.set('views', path.join(__dirname, 'views')); // Set the directory for the views (templates) to be the 'views' folder in the current directory

// 1. GLOBAL Middleware

// Serve static files from folders
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' folder

// set security HTTP headers
app.use(helmet());

// Reading of the variables from the file which happens here to the node process only needs to happen once.
// not use logging to the production
if (process.env.NODE_ENV === 'development') app.use(morgan('dev')); // Use morgan for logging HTTP requests in development mode

const limiter = ratelimit({
  max: 100, // Limit each IP to 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  message: 'Too many requests from this IP, please try again in an hour!', // Message to send when rate limit is exceeded
});
// Apply the rate limiting middleware to all routes that start with /api
app.use('/api', limiter);

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb, to prevent malicious users from sending large payloads
app.use(cookieParser()); // Middleware to parse cookies from the request headers

// Do Data sanitization after parsing the body data
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS (Cross-Site Scripting) attacks
app.use(xss()); // Clean user input from malicious HTML code, to prevent XSS attacks
// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ], // Allow duplicate query parameters for these fields, for example, ?duration=5&duration=9 will be allowed, and the last one will be used, so it will be treated as ?duration=9
  })
); // use here cuz it use to clear the query string, so it should be before the route handlers

// compressio all the text that send to the client
// not working on the images
app.use(compression());

// Test Middleware
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   // console.log(req.cookies); // Log the cookies from the request headers, to test if cookie-parser middleware is working
//   next();
// });

// Mount Routers
app.use('/', viewsRouter); // Mount the view router to handle all routes that start with /, which are the routes for rendering the views (templates)

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// RUN ALL HTTP METHODS GET, POST, PUT, DELETE, etc.
// Resquest response cycle was not yet finished
// Place under all the route handlers
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.statusCode = 404;
  // err.status = 'fail';

  // Pass the error to the global error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
// Express knows this is an error handling middleware because it has 4 arguments
app.use(globalErrorHandler);

// // CUSTOM MIDDLEWARE EXAMPLE
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString(); // Add a custom property to the request object
//   // Call next() to pass control to the next middleware or route handler
//   next();
// });

// 4. Server Setup
module.exports = app; // Export the app for use in other files (like server.js)
