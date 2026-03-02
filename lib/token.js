import Cookies from 'js-cookie';

// Token management utilities
export const setAuthToken = (token) => {
  if (token) {
    Cookies.set('auth_token', token, { expires: 7 }); // 7 days
  } else {
    Cookies.remove('auth_token');
  }
};

export const getAuthToken = () => {
  return Cookies.get('auth_token');
};

export const removeAuthToken = () => {
  Cookies.remove('auth_token');
};

