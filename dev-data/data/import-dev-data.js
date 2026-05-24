const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
// Import the Tour model
const Tour = require('../../models/tourModel'); // Adjust the path as necessary
const Review = require('../../models/reviewModel'); // Adjust the path as necessary
const User = require('../../models/userModel'); // Adjust the path as necessary

// Make sure call this code before use app
// To use process.env in app.js
dotenv.config({ path: './config.env' });

/////////////////////////////////////////////////////////////////////
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
); // Replace <PASSWORD> with the actual password from environment variables
// Connect to MongoDB using Mongoose

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
  })
  .catch((err) => {
    console.error('DB connection error:', err);
    throw new Error('DB connecton failed: ' + err.message);
  });

// Read the JSON file containing tour data
const tours = JSON.parse(
  // read the file and parse it to JSON
  fs.readFileSync(`${__dirname}/tours.json`, 'utf-8')
);

const users = JSON.parse(
  // read the file and parse it to JSON
  fs.readFileSync(`${__dirname}/users.json`, 'utf-8')
);

const reviews = JSON.parse(
  // read the file and parse it to JSON
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

const importData = async () => {
  try {
    // Insert the tour data into the database
    await Tour.create(tours); // Create multiple tours at once
    await User.create(users, { validateBeforeSave: false }); // Create multiple users at once
    await Review.create(reviews); // Create multiple reviews at once
    console.log('Data successfully loaded!');
  } catch (error) {
    console.error('Error loading data:', error);
  }
  process.exit(); // Exit the process after importing data
};

const deleteData = async () => {
  try {
    // Delete all tours from the database
    await Tour.deleteMany(); // Remove all documents in the Tour collection
    await User.deleteMany(); // Remove all documents in the Tour collection
    await Review.deleteMany(); // Remove all documents in the Tour collection
    console.log('Data successfully deleted!');
  } catch (error) {
    console.error('Error deleting data:', error);
  }
  process.exit(); // Exit the process(stop application) after deleting data
};

console.log(process.argv); // Log the command line arguments

if (process.argv[2] === '--import') {
  importData(); // Call the import function if --import is passed
} else if (process.argv[2] === '--delete') {
  deleteData(); // Call the delete function if --delete is passed
} else {
  console.log('Please provide a valid argument: --import or --delete');
  process.exit(1); // Exit with an error code if no valid argument is provided
}
// Note: This script is intended to be run from the command line, e.g.:
// node dev-data/data/import-dev-data.js --import
// or
// node dev-data/data/import-dev-data.js --delete
// Make sure to adjust the path to the JSON file as necessary based on your project structure.
