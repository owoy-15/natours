const AppError = require('../utils/appError');

function handleCastErrorDB(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}.`, 400);
}

function handleDuplicateFieldsDB(err) {
  // or use regex to extract value err?.errmsg.match(...)
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return new AppError(
    `Duplicate field value: ${value} . Please use another value!`,
    400
  );
}

function handleValidationErrorDB(err) {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
}

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // /api/....
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // RENDER TEMPLATE (render when it has global error)
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = (err, req, res) => {
  // For APIs
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    console.log('test ==============');
    console.log(err);
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Programing or other unknown error: don't leak error details
      // 1. log the error
      console.log('ERROR : ', err);
      // 2. send generic message
      return res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!',
      });
    }
  }

  // RENDER WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }

  // Programing or other unknown error: don't leak error details
  // 1. log the error
  console.log('ERROR : ', err);
  // 2. send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

// Global Error Handling Middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Pass the global error to this function
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = err;

    console.log(error);

    if (err.name === 'CastError') error = handleCastErrorDB(error);

    if (err.code === 11000) error = handleDuplicateFieldsDB(error);

    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

    if (error.name === 'JsonWebTokenError') error = handleJWTError();

    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
