const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router(); // create a new router instance for user

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
// use patch because we are updating the password, not creating a new resource
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect); // Protect all routes after this middleware, so that only authenticated users can access the routes below

// Get the authenticated user's data
router.get(
  '/me',
  userController.getMe, // Middleware to set the ID in the request parameters to the authenticated user's ID, so that we can reuse the getUser controller to get the authenticated user's data
  userController.getUser
);
router.patch('/updateMyPassword', authController.updatePassword);
// Name of the field that u want to upload image
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin')); // Restrict all routes after this middleware to only admin users, so that only admin users can access the routes below

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
