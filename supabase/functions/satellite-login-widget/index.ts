import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "X-Frame-Options": "ALLOWALL",
};

function renderWidget(supabaseUrl: string, supabaseAnonKey: string, lang: string): string {
  const isEs = lang === "es";

  const labels = {
    title: isEs ? "Iniciar sesión" : "Sign in",
    subtitle: isEs ? "Accede a tu cuenta Asciende" : "Access your Asciende account",
    emailPlaceholder: isEs ? "Correo electrónico" : "Email",
    passwordPlaceholder: isEs ? "Contraseña" : "Password",
    submit: isEs ? "Ingresar" : "Sign in",
    submitting: isEs ? "Ingresando..." : "Signing in...",
    errorInvalid: isEs ? "Credenciales incorrectas" : "Invalid credentials",
    errorNetwork: isEs ? "Error de conexión" : "Connection error",
    forgotPassword: isEs ? "¿Olvidaste tu contraseña?" : "Forgot password?",
    forgotHint: isEs ? "Ingresa a asciende.pro para recuperarla" : "Visit asciende.pro to reset it",
  };

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${labels.title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --brand: #fdda36;
      --brand-dark: #f5cf25;
      --accent: #514163;
      --bg: #0f1117;
      --surface: #1a1d27;
      --border: #2a2d3a;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --error-bg: #2d1415;
      --error-border: #7f1d1d;
      --error-text: #fca5a5;
      --radius: 12px;
      --radius-sm: 8px;
    }

    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      min-height: 100vh;
    }

    .card {
      width: 100%;
      max-width: 360px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 28px 24px 24px;
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: var(--brand);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-icon svg {
      width: 20px;
      height: 20px;
      fill: #1a1d27;
    }

    .logo-text {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: var(--text);
    }

    .logo-text span {
      color: var(--brand);
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
      letter-spacing: -0.4px;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 20px;
    }

    .field {
      margin-bottom: 12px;
    }

    .field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .input-wrap {
      position: relative;
    }

    .input-wrap svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--muted);
      pointer-events: none;
    }

    input {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-size: 14px;
      padding: 10px 12px 10px 38px;
      outline: none;
      transition: border-color 0.15s;
      -webkit-appearance: none;
    }

    input::placeholder {
      color: #4b5563;
    }

    input:focus {
      border-color: var(--brand);
    }

    .toggle-pw {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--muted);
    }

    .toggle-pw svg {
      position: static;
      transform: none;
      display: block;
    }

    .error-box {
      display: none;
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      font-size: 13px;
      color: var(--error-text);
      margin-bottom: 12px;
      align-items: center;
      gap: 8px;
    }

    .error-box.visible {
      display: flex;
    }

    .btn {
      width: 100%;
      background: var(--brand);
      color: #1a1d27;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 700;
      padding: 11px;
      cursor: pointer;
      margin-top: 4px;
      transition: background 0.15s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      letter-spacing: -0.2px;
    }

    .btn:hover { background: var(--brand-dark); }
    .btn:active { transform: scale(0.98); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(26,29,39,0.3);
      border-top-color: #1a1d27;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: none;
    }

    .btn.loading .spinner { display: block; }
    .btn.loading .btn-label { display: none; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }

    .footer a {
      color: var(--brand);
      text-decoration: none;
    }

    .footer a:hover { text-decoration: underline; }

    .success-state {
      display: none;
      text-align: center;
      padding: 16px 0;
    }

    .success-state.visible { display: block; }

    .success-check {
      width: 48px;
      height: 48px;
      background: #052e16;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .success-check svg {
      width: 24px;
      height: 24px;
      color: #4ade80;
    }

    .success-state h2 {
      font-size: 16px;
      color: var(--text);
      margin-bottom: 4px;
    }

    .success-state p {
      font-size: 13px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="logo-text">ascien<span>de</span>.pro</div>
    </div>

    <div id="form-state">
      <h1>${labels.title}</h1>
      <p class="subtitle">${labels.subtitle}</p>

      <div class="error-box" id="error-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="error-msg"></span>
      </div>

      <form id="login-form" autocomplete="on" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <div class="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              id="email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="${labels.emailPlaceholder}"
              required
            />
          </div>
        </div>

        <div class="field">
          <label for="password">${isEs ? "Contraseña" : "Password"}</label>
          <div class="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="${labels.passwordPlaceholder}"
              required
            />
            <button type="button" class="toggle-pw" id="toggle-pw" aria-label="Toggle password">
              <svg id="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg id="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="display:none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="btn" id="submit-btn">
          <span class="spinner"></span>
          <span class="btn-label">${labels.submit}</span>
        </button>
      </form>

      <div class="footer">
        <span>${labels.forgotPassword}</span><br/>
        <a href="https://asciende.pro" target="_blank" rel="noopener">${labels.forgotHint}</a>
      </div>
    </div>

    <div class="success-state" id="success-state">
      <div class="success-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2>${isEs ? "Sesión iniciada" : "Signed in"}</h2>
      <p>${isEs ? "Cargando..." : "Loading..."}</p>
    </div>
  </div>

  <script>
    const SUPABASE_FUNCTIONS_URL = '${supabaseUrl}/functions/v1';
    const ANON_KEY = '${supabaseAnonKey}';

    // Toggle password visibility
    document.getElementById('toggle-pw').addEventListener('click', function() {
      const input = document.getElementById('password');
      const open = document.getElementById('eye-open');
      const closed = document.getElementById('eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        open.style.display = 'none';
        closed.style.display = 'block';
      } else {
        input.type = 'password';
        open.style.display = 'block';
        closed.style.display = 'none';
      }
    });

    function showError(msg) {
      const box = document.getElementById('error-box');
      document.getElementById('error-msg').textContent = msg;
      box.classList.add('visible');
    }

    function hideError() {
      document.getElementById('error-box').classList.remove('visible');
    }

    function setLoading(loading) {
      const btn = document.getElementById('submit-btn');
      if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }

    function showSuccess() {
      document.getElementById('form-state').style.display = 'none';
      document.getElementById('success-state').classList.add('visible');
    }

    document.getElementById('login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      hideError();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) return;

      setLoading(true);

      try {
        const res = await fetch(SUPABASE_FUNCTIONS_URL + '/auth-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          showError(data.error || '${labels.errorInvalid}');
          setLoading(false);
          return;
        }

        showSuccess();

        // Send token to parent window (satellite)
        window.parent.postMessage(
          { type: 'ASCIENDE_LOGIN_SUCCESS', token: data.token, user: data.user },
          '*'
        );

      } catch (err) {
        console.error('Login error:', err);
        showError('${labels.errorNetwork}');
        setLoading(false);
      }
    });

    // Notify parent that widget is ready
    window.parent.postMessage({ type: 'ASCIENDE_WIDGET_READY' }, '*');
  </script>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") || "es";

    const html = renderWidget(SUPABASE_URL, SUPABASE_ANON_KEY, lang);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Widget error:", err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
});
