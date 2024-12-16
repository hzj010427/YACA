import axios, { AxiosResponse } from 'axios';
import { IResponse, isAppError, isSuccess } from '../common/server.responses';
import { IUser } from '../common/user.interface';
import { response } from 'express';
import { on } from 'events';

async function login() {
  try {
    const email = (document.getElementById('myEmail') as HTMLInputElement).value;
    const pwd = (document.getElementById('myPassword') as HTMLInputElement).value;

    const response: AxiosResponse<IResponse> = await axios.post('/auth/tokens/' + email, { password: pwd });

    if (isSuccess(response.data)) {
      const { token, user } = response.data.payload as { token: string; user: IUser};
      localStorage.setItem('token', token);
      localStorage.setItem('username', user.credentials.username);
      alert(response.data.message);
      window.location.href = '/chat';
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error');
      console.error('Unknown error:', err);
    }

    window.location.href = '/auth';
  }
}

async function register() {
  try {
    const name = (document.getElementById('myName') as HTMLInputElement).value;
    const email = (document.getElementById('myEmail') as HTMLInputElement).value;
    const pwd = (document.getElementById('myPassword') as HTMLInputElement).value;

    const newUser: IUser = {
      credentials: { username: email, password: pwd },
      extra: name,
    };

    const response: AxiosResponse<IResponse> = await axios.post('/auth/users', newUser);

    alert(response.data.message);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      alert(err.response?.data?.message);
    } else {
      alert('Unknown error');
      console.error('Unknown error:', err);
    }
  } finally {
    window.location.href = '/auth';
  }
}

async function onSubmitForm(e: SubmitEvent) {
  e.preventDefault();
  const whichButton: HTMLButtonElement = e.submitter as HTMLButtonElement;

  if (whichButton.id === 'loginBtn') {
    await login();
  } else if (whichButton.id === 'registerBtn') {
    await register();
  } else {
    // TODO
  }
}

async function onTogglePwd(e: Event) {
  e.preventDefault();
  const pwd = document.getElementById('myPassword') as HTMLInputElement;
  const togglePwd = document.getElementById('togglePwd') as HTMLInputElement;

  const isPwdHidden = pwd.type === 'password';
  pwd.type = isPwdHidden ? 'text' : 'password';
  togglePwd.className = isPwdHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
  togglePwd.title = isPwdHidden ? 'Hide Password' : 'Show Password';
}

document.addEventListener('DOMContentLoaded', async function (e: Event) {
  // document-ready event handler
  console.log('Auth page loaded successfully');
  // TODO: anything else?
  const form = document.getElementById('authForm') as HTMLFormElement;
  form.addEventListener('submit', onSubmitForm);

  const togglePwd = document.getElementById('togglePwd') as HTMLInputElement;
  togglePwd.addEventListener('click', onTogglePwd);
});
