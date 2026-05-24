const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { type } = require('os');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    trim: true,
  },
  photo: String,
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    unique: true,
    lowercase: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email!'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password!'],
    minlength: [8, 'Password must be at least 8 characters long!'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password!'],
    minlength: [8, 'Comfirm password must be at least 8 characters long!'],
    // This validator only works on create new object and on 'save'
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords are not matching!',
    },
    select: false,
  },
  passwordChangedAt: {
    type: Date,
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'guide', 'lead-guide', 'admin'],
      message: 'Role is either: user, guide, lead-guide, admin',
    },
    default: 'user',
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// Runs before .save() and .create()
// This middleware will only run if the password was actually modified, not on other updates like name or email
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // After the validation this field no longer need and this middleware runs AFTER validation
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  // If password is not modified or the document is new, skip this middleware
  if (!this.isModified('password') || this.isNew) return next();

  // this
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure the token is always created after the password has been changed
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query, so we can chain find() method to filter out inactive users
  this.find({ active: { $ne: false } });
  next();
});

// instance methods - called on a document
// eg. await user.correctPassword(password, user.password) - return boolean
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // this - point to current document, but don't have password property, select: false
  // return true if the password is correct, false if not
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user changed password after the JWT token was issued
// Compare token issue time (iat) with password change time.
// JWTTimestamp is used to compare with changedPasswordAt timestamp
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // Explicitly select passwordChangedAt field when querying current user in authController
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // console.log(JWTTimestamp, changedTimestamp);
    return JWTTimestamp < changedTimestamp; // true means password was changed after the token was issued, so the token is invalid, false means password was not changed after the token was issued, so the token is valid
  }

  // False means NOT changed
  return false;
};

// Modified user's document for reset password - not saved to database yet
userSchema.methods.createPasswordResetToken = function () {
  // Generate a secure random reset token (plain text)
  // This token will be sent to the user via email
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the reset token before saving it to the database
  // The plain token is NEVER stored in the DB for security reasons
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  // Set token expiration time (10 minutes from now)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the plain token so it can be emailed to the user
  return resetToken;
};

userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.passwordConfirm;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.passwordChangedAt;
    delete ret.active;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
