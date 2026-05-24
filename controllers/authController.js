const { promisify } = require('util'); // from Node
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { send } = require('process');

const signToken = (id) => {
  return jwt.sign(
    {
      // Payload
      id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password field before sending the response
  // user.password = undefined;

  // for security reason, we don't want to send the token in the response body, but we want to send it in a cookie, so we can set the cookie in the response header, and then the client can store the cookie and send it back in the next request, so we can use the token from the cookie to authenticate the user
  // res.status(statusCode).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user,
  //   },
  // });

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), // convert days to milliseconds
    httpOnly: true, // cookie cannot be accessed or modified by the browser, only sent in HTTP requests, protect against XSS attacks
    secure: process.env.NODE_ENV === 'production', // only send cookie in HTTPS, protect against man;
  });

  res.status(statusCode).json({
    status: 'success',
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // Only allow the datas that actually need to be put into the new user
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role, // not safe, but for testing purpose, in production, we should not allow users to specify their role when signing up, and instead set the default role to 'user' in the userModel.js, and only allow admin to change the role of a user
  });

  const url = `${req.protocol}://${req.get('host')}/me`;

  // Send Welcome email to user after acc is created
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.signin = async (req, res, next) => {
  const { email, password } = req.body;
  // 1. Check if email and password
  if (!email || !password)
    return next(new AppError('Please provide email and password!', 400));

  // 2. Check if user exists && password is correct
  // explicity select password
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1.  Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(new AppError('Your are not log in to get access.', 400));

  // 2. Verification token
  // Test Signature
  // Check the token's signature, expiration, tampering
  // If valid, return the decoded payload
  // If invalid/expired, throws an error
  // verify() is async function after verify it call callback function
  // jwt.verify(token, process.env.JWT_SECRET, callbackFunction);
  // If error happens inside async function, it will be caught by catchAsync and passed to global error handling middleware
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // return a Promise - not break the pattern

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id).select(
    '+passwordChangedAt'
  );

  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4. Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Please log in again.', 401)
    );
  }

  // Remove sensitive field
  // Option 1: Manual removal (one line)
  currentUser.passwordChangedAt = undefined;

  // // Option 2: Automatic removal using schema transform (recommended)
  // // It needs add some code in userModel.js
  // req.user = currentUser.toObject(); // passwordChangedAt automatically removed

  // Grant access to protected route → attach user to request
  // Reuse user info without querying the database again
  req.user = currentUser;
  res.locals.user = currentUser; // use in local(conditional template)
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1. Verification token
      // Test Signature
      // Check the token's signature, expiration, tampering
      // If valid, return the decoded payload
      // If invalid/expired, throws an error
      // verify() is async function after verify it call callback function
      // jwt.verify(token, process.env.JWT_SECRET, callbackFunction);
      // If error happens inside async function, it will be caught by catchAsync and passed to global error handling middleware
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      ); // return a Promise - not break the pattern

      // 2. Check if user still exists
      const currentUser = await User.findById(decoded.id).select(
        '+passwordChangedAt'
      );

      if (!currentUser) {
        return next();
      }

      // 3. Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      res.locals.user = currentUser; // Make the user data available in the templates, so we can use it to conditionally render the login/logout buttons in the header, and also display the user's name in the header when logged in
      return next();
    }
  } catch (error) {
    return next();
  }
  next(); // if there is no token, or token is invalid, or user does not exist, or user changed password after token was issued, just call next() to pass control to the next middleware, which will render the page without the user data, so the login/logout buttons will be rendered accordingly in the header
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide'], roles='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2. Generate the random reset token - work on userModel.js
  // return the plain reset token and then compare the hashed token in database when user reset password
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // import from utils/email.js
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 min)',
    //   message,
    // });

    // 3. Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // happen on the server, not user's fault, so 500
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }

  // 4. Send response
  // resetToken is sent to user's email(safe place), not in the response cuz of security reason
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  // crypto use short-lived token and bcrpto for long-term token like password, because crypto is not secure enough for long-term token, but it's good enough for short-lived token like reset token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken, // check if token is correct
    passwordResetExpires: { $gt: Date.now() }, // check if token has not expired
  });

  // 2. If token has not expired and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm; // this field will be remove by the pre save middleware in userModel.js, but it needs to be provided here for validation
  user.passwordResetToken = undefined; // clear the reset token and expiration time
  user.passwordResetExpires = undefined;
  await user.save(); // run validators for password and passwordConfirm, and also run the pre save middleware to update passwordChangedAt property

  // 3. Update changedPasswordAt propperty for the user
  // This is done in the pre save middleware in userModel.js, so it will automatically update the passwordChangedAt property when the password is changed

  // 4. Log the user in, send JWT
  createSendToken(user, 200, res);
});

// For authenticated users to update their password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2. Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3. If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm; // this field will be remove by the pre save middleware in userModel.js, but it needs to be provided here for validation
  await user.save(); // run validators for password and passwordConfirm, and also run the pre save middleware to update passwordChangedAt property
  // user.findByIdAndUpdate() will not work because it will not run validators and pre save middleware, so we need to use save() method to update the password and also update the passwordChangedAt property

  // 4. Log user in, send JWT
  createSendToken(user, 200, res);
});
