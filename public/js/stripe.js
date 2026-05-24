// /* eslint-disable */
// import { showAlert } from './alerts';

// const stripe = Stripe(
//   'pk_test_51TYjQGGfDJLpIOAwRtmAWL9FHpRbgWzaMMT14x0MEhKsYn8yqgrusyesdumQU3H0I01WQkNWFOUIkX9mhioMw0XR00WN6NySkX'
// );

// export const bookTour = async (tourId) => {
//   try {
//     // 1) Get checkout session from API
//     const response = await fetch(
//       `/api/v1/bookings/checkout-session/${tourId}`
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || 'Something went wrong');
//     }

//     // 2) Redirect to Stripe Checkout
//     await stripe.redirectToCheckout({
//       sessionId: data.session.id,
//     });
//   } catch (err) {
//     console.log(err);

//     showAlert('error', err.message);
//   }
// };

// //  UNDEFINE STRIPE ERROR, I WILL FIX IT LATER
