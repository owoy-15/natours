const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/userModel');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');

const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2. Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    // NOT Secure
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,
    // cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,

    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`http://127.0.0.1:3000/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3. Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
  next();
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only Temporary, bc it's Unsecure: everyone can make a booking without paying
//   const { tour, user, price } = req.query;
//   console.log(tour, user, price);
//   if (!tour && !user && !price) {
//     return next(); // on this route '/'
//   }

//   await Booking.create({ tour, user, price });

//   // create new request to this route URL
//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].unit_amount / 100;

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    //Send response to stripe
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === 'checkout.session.complete')
    createBookingCheckout(event.data.object);

  // Send response to Stripe
  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);

exports.getBooking = factory.getOne(Booking);

exports.getAllBookings = factory.getAll(Booking);

exports.updateBooking = factory.updateOne(Booking);

exports.deleteBooking = factory.deleteOne(Booking);
