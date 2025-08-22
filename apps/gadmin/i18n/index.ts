export type Locale = 'en' | 'es';

const en = {
  login: 'Login',
  email: 'Email',
  password: 'Password',
  enter: 'Enter',
  theme: 'Theme',
  style: 'Style'
};

const es = {
  login: 'Acceso',
  email: 'Correo',
  password: 'Contraseña',
  enter: 'Entrar',
  theme: 'Tema',
  style: 'Estilo'
};

export const dictionaries: Record<Locale, Record<string, string>> = { en, es };
