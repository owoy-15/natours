class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call parent Error constructor

    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Remove constructor from stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
