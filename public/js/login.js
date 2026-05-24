import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/users/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log(data);
      throw new Error(data.message);
    }

    // Redirect to the homepage after successful login
    showAlert('success', 'Logged in successfully');
    window.location.href = '/';
  } catch (err) {
    showAlert('error', err.message);
  }
};

export const logout = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/users/logout');

    if (!res.ok) throw new Error('Request failed');

    const data = await res.json();

    if (data.status === 'success') {
      location.reload(true);
    }
  } catch (error) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
