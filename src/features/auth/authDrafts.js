/**
 * In-memory draft store for Login and Register forms
 *
 * Preserves user entered values when switching tabs between Login and Register
 * so inputs are not lost. Cleared upon successful submission.
 */

let loginDraft = {
  email: '',
  password: '',
};

let registerDraft = {
  activeTab: 'user',
  name: '',
  email: '',
  password: '',
  city: 'Bengaluru',
  phone: '',
  agency: '',
  reraNumber: '',
  licenseUploaded: false,
};

export const getLoginDraft = () => ({ ...loginDraft });

export const setLoginDraft = (data) => {
  loginDraft = { ...loginDraft, ...data };
};

export const clearLoginDraft = () => {
  loginDraft = { email: '', password: '' };
};

export const getRegisterDraft = () => ({ ...registerDraft });

export const setRegisterDraft = (data) => {
  registerDraft = { ...registerDraft, ...data };
};

export const clearRegisterDraft = () => {
  registerDraft = {
    activeTab: 'user',
    name: '',
    email: '',
    password: '',
    city: 'Bengaluru',
    phone: '',
    agency: '',
    reraNumber: '',
    licenseUploaded: false,
  };
};
