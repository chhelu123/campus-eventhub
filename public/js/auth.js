// Login and sign-up pages: client-side validation, then POST to the auth API.
function showFormError(msg) {
  const box = document.getElementById('form-error');
  box.textContent = msg;
  box.classList.toggle('hidden', !msg);
}

function afterLogin(user) {
  const next = qs('next');
  // only allow same-site relative redirects
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  location.href = safeNext || (user.role === 'admin' ? '/admin' : '/');
}

async function submitWith(form, path, body) {
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  showFormError('');
  try {
    const { user } = await api(path, { method: 'POST', body });
    afterLogin(user);
  } catch (err) {
    showFormError(err.message);
    btn.disabled = false;
  }
}

(async () => {
  const user = await initPage();
  if (user) return afterLogin(user); // already logged in

  const login = document.getElementById('login-form');
  if (login) {
    login.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const ok = validateForm(login, {
        email: [[(v) => v, 'Email is required'], [isEmail, 'Enter a valid email address']],
        password: [[(v) => v, 'Password is required']],
      });
      if (ok) submitWith(login, '/auth/login', { email: login.email.value, password: login.password.value });
    });
  }

  const signup = document.getElementById('signup-form');
  if (signup) {
    signup.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const ok = validateForm(signup, {
        name: [[(v) => v.length >= 2, 'Please enter your full name'], [(v) => /^[a-zA-Z .'-]+$/.test(v), 'Name can only contain letters']],
        email: [[(v) => v, 'Email is required'], [isEmail, 'Enter a valid email address']],
        department: [[(v) => v, 'Choose your department']],
        year: [[(v) => v, 'Choose your year']],
        password: [[(v) => v.length >= 6, 'Password must be at least 6 characters']],
        confirm: [[(v, f) => v === f.password.value, 'Passwords do not match']],
      });
      if (ok) {
        const f = signup.elements;
        submitWith(signup, '/auth/signup', {
          name: f.name.value, email: f.email.value, password: f.password.value,
          department: f.department.value, year: f.year.value,
        });
      }
    });
  }
})();
