class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // mogoose query
    this.queryString = queryString;
  }

  filter() {
    // Filtering tours based on query parameters
    const queryObj = { ...this.queryString }; // Create(shallow copy) a copy of the query object
    const excludedFields = ['page', 'sort', 'limit', 'fields']; // Fields to exclude
    // use delete operator to remove excluded fields from the query object
    // The delete operator removes a property from an object
    excludedFields.forEach((el) => delete queryObj[el]); // Remove excluded fields from the query object
    // Advanced filtering
    // Example: /api/v1/tours?duration[gte]=5&difficulty=easy
    // {difficulty: 'easy', duration: { $gte: 5 }} in moongoDB look like this
    // Convert query parameters to MongoDB operators
    let queryStr = JSON.stringify(queryObj); // Convert the query object to a string
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // Replace gte, gt, lte, lt with $gte, $gt, $lte, $lt

    // Even though you “write” find() multiple times, MongoDB is only hit once.
    this.query = this.query.find(JSON.parse(queryStr));

    // refers to the current instance of the class that’s created
    return this; // IMPORTANT: enable chaining

    // Use Mongoose to find all tours (array) and it returns a promise
    // let query = Tour.find(JSON.parse(queryStr)); // Using filter object and ir returns a query object(prototype of Mongoose Query)
  }

  sort() {
    // Sorting tours based on query parameters
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); // Convert sort query to a space-separated string
      // Example: /api/v1/tours?sort=price,ratingAverage
      // sort('price ratingsAverage') // Sort by price and ratingsAverage
      // Use Mongoose to sort the tours
      this.query = this.query.sort(sortBy); // Sort by the specified fields
    } else {
      this.query = this.query.sort('-createdAt'); // Default sort by createdAt in descending order
    }
    // refers to the current instance of the class that’s created
    return this; // IMPORTANT: enable chaining
  }

  limitFields() {
    // Fields limitting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Excluding
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    // Pagination
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    // Handle if requested page doesn't exist
    // if (this.queryString.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) {
    //     throw new Error('This page does not exist');
    //   }
    // }
    return this;
  }
}

module.exports = APIFeatures;
