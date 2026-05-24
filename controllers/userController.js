const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-34y6783647234(id)-33242545(timestamp).jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });
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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = async (req, res, next) => {
  if (!req.file) return next();

  // Redefine here and use in updateMe Route
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // Do not store in the disk
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({
      quality: 90, // 90%
    })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id; // Set the ID in the request parameters to the authenticated user's ID, so that we can reuse the getUser controller to get the authenticated user's data
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.'
      ),
      400
    );
  }

  // 2. Update user document

  // Filtered out unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // Do NOT directly use req.body to update the user, because it may contain fields that we do not want to update, such as role, password, etc. So we should only pick the fields that we want to update from the request body, and then use those fields to update the user.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  ///////////////////////////////
  // const user = await User.findById(req.user.id);
  // user.name = req.body.name || user.name; // if the name is not provided in the request body, keep the existing name
  // user.email = req.body.email || user.email;
  // await user.save();

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // We are not actually deleting the user from the database, but instead we are setting the active field to false, so that the user can be easily reactivated in the future if needed, and also we can keep the user's data for analytics and other purposes.
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// Do NOT update password with this!
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
