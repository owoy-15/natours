import '@babel/polyfill'; // Include some features of of the js
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

const loginForm = document.querySelector('.form-login');
const logoutButton = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordsForm = document.querySelector('.form-user-password');
// const bookBtn = document.getElementById('book-tour');

if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    login(email, password);
  });

if (logoutButton) logoutButton.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Recreate a multi-part form data

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);

    const photo = document.getElementById('photo').files[0];
    if (photo) form.append('photo', photo);

    updateSettings(form, 'data');
  });

if (userPasswordsForm)
  userPasswordsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    document.querySelector('.btn--save-password').textContent = 'Updating ...';

    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { currentPassword, password, passwordConfirm },
      'password'
    );
    document.querySelector('.btn--save-password').textContent =
      'Save Password ';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });

// if (bookBtn)
//   bookBtn.addEventListener('click', async (e) => {
//     e.target.textContent = 'Processing ...';
//     const { tourId } = e.target.dataset;

//     await bookTour(tourId);
//     e.target.textContent = 'Book tour now!';
//   });

const bookBtn = document.getElementById('book-tour');
if (bookBtn)
  bookBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Inform the user that Stripe payments are currently unavailable
    e.target.textContent =
      'Stripe payment unavailable — we will update this later';
    e.target.disabled = true;

    // Also show an immediate alert so it's clear
    alert(
      'Stripe payments are temporarily unavailable. Booking via Stripe will be added later.'
    );
  });
