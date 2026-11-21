import type { PublicUser } from '@bc/shared';
import { api, setToken } from '../net/api';
import { pendingInvite } from '../net/invite';
import { $, clear, h } from './dom';

/** Login / registration screen. */
export function renderAuth(onAuthed: (token: string, user: PublicUser) => void) {
  const root = $('#screen-auth');
  clear(root);
  let mode: 'login' | 'register' = 'login';
  const user = h('input', { placeholder: 'Username', autocomplete: 'username', maxLength: 20 });
  const pass = h('input', { placeholder: 'Password', type: 'password', autocomplete: 'current-password', maxLength: 100 });
  const err = h('div', { class: 'form-error' });
  const submit = h('button', { class: 'btn big', type: 'submit' }, 'Enter the field');
  const toggle = h('a', { href: '#', class: 'link' });
  const sync = () => {
    submit.textContent = mode === 'login' ? 'Enter the field' : 'Create account';
    toggle.textContent = mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in';
    pass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    err.textContent = '';
  };
  toggle.addEventListener('click', (e) => { e.preventDefault(); mode = mode === 'login' ? 'register' : 'login'; sync(); });
  const form = h('form', { class: 'auth-form', onsubmit: async (e: Event) => {
    e.preventDefault();
    err.textContent = '';
    submit.disabled = true;
    try {
      const res = mode === 'login' ? await api.login(user.value, pass.value) : await api.register(user.value, pass.value);
      setToken(res.token);
      onAuthed(res.token, res.user);
    } catch (ex) {
      err.textContent = (ex as Error).message;
    } finally {
      submit.disabled = false;
    }
  } }, user, pass, err, submit, toggle);
  sync();
  root.append(h('div', { class: 'auth-card' },
    h('div', { class: 'crest' }),
    h('h1', { class: 'title' }, 'Castle Defense'),
    h('p', { class: 'tagline' }, 'Raise your war camp. Let your armies march. Bring down the enemy castle.'),
    pendingInvite() ? h('p', { class: 'invite-note' }, `You were invited to a game (code ${pendingInvite()}). Sign in or create an account to join it.`) : null,
    form,
  ));
  user.focus();
}
