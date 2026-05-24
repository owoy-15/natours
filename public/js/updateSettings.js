import { showAlert } from './alerts';

// type is either 'password' and 'data'
export const updateSettings = async (info, type) => {
  // info (email and name)
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';

    const fetchOptions = {
      method: 'PATCH',
      //   credentials: 'include',
      body: info,
    };

    if (!(info instanceof FormData)) {
      fetchOptions.headers = {
        'Content-Type': 'application/json',
      };
      fetchOptions.body = JSON.stringify(info);
    }

    const res = await fetch(url, fetchOptions);

    const data = await res.json();

    if (data.status === 'success') {
      location.reload(true);
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    showAlert('error', error.message);
  }
};
