const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Put it on the very top of the file, before importing any other files
// Error Type: sync
// uncaughtException is a Node.js process-level event that fires when a synchronous JavaScript error is thrown and not caught anywhere in your code.
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);

  // Why not use server.close() - when an uncaughtException happens, the Node process is already in an unsafe / corrupted state.
  process.exit(1); // 0 for success, 1 for uncaught exception

  // Optional: close server first before exiting process for async errors or server connections
  // server.close(() => {
  //   console.log('All requests finished. Exiting...');
  //   process.exit(1); // 0 for success, 1 for uncaught exception
  // });
});

// Make sure call this code before use app
// To use process.env in app.js------------------------------------------------------------------------------
dotenv.config({ path: './config.env' });

const app = require('./app'); // Import the Express app from app.js

// Server Setup and Database Connection
/////////////////////////////////////////////////////////////////////
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
); // Replace <PASSWORD> with the actual password from en1````````````

// The Promise returned by mongoose.connect
mongoose
  // if use in local development, make sure to run server in the terminal
  // .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    // some options in order to deal with some deprecation warnings
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false, // Disable findAndModify deprecation warning
  })
  .then((connect) => {
    console.log('DB connection successful!');
  }); // use UnhandledRejection event to catch error instead of catch here
// .catch((err) => {
//   console.error('DB connection error:', err);
//   throw new Error('DB connecton failed: ' + err.message);
// });

const port = process.env.PORT || 3001;
// Start the Server
app.listen(port, () => {
  console.log('Server is running on http://localhost:3000');
});

// Error Type: async
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);

  // Optional: close server first before exiting process
  server.close(() => {
    console.log('All requests finished. Exiting...');
    process.exit(1); // 0 for success, 1 for uncaught exception
  });
});

// To cleanly shut down your app before process exits.
// Example:
// close database connections
// finish requests
// stop server safely
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting Down Gracfully.');

  server.close(() => {
    console.log('Process teminated!');
  });
});
