import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('enseignant');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password, role);
      // Redirect based on role from backend (DB values: Administrateur, Enseignant, Agent)
      if (user.role === 'Agent' || user.role === 'Administrateur') {
        navigate('/agent/dashboard');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Erreur de connexion. Vérifiez vos identifiants.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* ── Left Panel ── */}
      <aside className="login-left">
        <div className="login-left__bg" />

        {/* Decorative circles */}
        <div className="login-left__circle login-left__circle--lg" />
        <div className="login-left__circle login-left__circle--md" />
        <div className="login-left__circle login-left__circle--sm" />
        <div className="login-left__circle login-left__circle--xs" />

        {/* Top bar */}
        <div className="login-left__topbar">
          <div className="login-left__logo-icon">
            <span className="cross-h" />
            <span className="cross-v" />
            <span className="dot" />
          </div>
          <span className="login-left__logo-text">TRACE</span>
        </div>

        {/* Branding */}
        <div className="login-left__content">
          <div className="login-left__accent-bar" />
          <h1 className="login-left__title">TRACE</h1>
          <p className="login-left__subtitle">
            Teacher Record and Academic
            <br />
            Control Environment
          </p>
          <div className="login-left__divider" />
          <ul className="login-left__features">
            <li>Saisie et validation des notes académiques</li>
            <li>Gestion et suivi des absences</li>
            <li>Supervision des supports de cours</li>
            <li>Interface Enseignant &amp; Agent Pédagogique</li>
          </ul>
        </div>

        {/* Bottom badge */}
        <div className="login-left__badge">
          <div className="login-left__badge-icon">
            <span className="cross-h" />
            <span className="cross-v" />
          </div>
          <span className="login-left__badge-text">
            Université — Système académique
          </span>
        </div>

        <span className="login-left__version">v 1.0</span>
      </aside>

      {/* ── Right Panel ── */}
      <main className="login-right">
        <div className="login-right__dots" />

        <div className="login-card">
          <div className="login-card__accent-line" />

          {/* Card header */}
          <div className="login-card__header">
            <div className="login-card__logo">
              <span className="cross-h" />
              <span className="cross-v" />
              <span className="dot" />
            </div>
            <div className="login-card__title-group">
              <h2 className="login-card__title">TRACE</h2>
              <span className="login-card__subtitle">
                Portail de connexion
              </span>
            </div>
          </div>

          <div className="login-card__divider" />

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="login-form__error">{error}</div>}

            {/* Email */}
            <div className="login-form__group">
              <label className="login-form__label" htmlFor="login-email">
                Adresse email
              </label>
              <input
                id="login-email"
                className="login-form__input"
                type="email"
                placeholder="nom@univ.dz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="login-form__group">
              <label className="login-form__label" htmlFor="login-password">
                Mot de passe
              </label>
              <div className="login-form__input-wrapper">
                <input
                  id="login-password"
                  className="login-form__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-form__eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <label className="login-form__role-label">
              Profil de connexion
            </label>
            <div className="login-form__roles">
              <button
                type="button"
                className={`login-form__role-btn ${role === 'enseignant' ? 'login-form__role-btn--active' : ''}`}
                onClick={() => setRole('enseignant')}
              >
                {role === 'enseignant' && (
                  <span className="login-form__role-dot" />
                )}
                Enseignant
              </button>
              <button
                type="button"
                className={`login-form__role-btn ${role === 'agent' ? 'login-form__role-btn--active' : ''}`}
                onClick={() => setRole('agent')}
              >
                {role === 'agent' && (
                  <span className="login-form__role-dot" />
                )}
                Agent Pédagogique
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
              {!loading && <span className="login-form__submit-arrow">→</span>}
            </button>

            <p className="login-form__forgot">Mot de passe oublié ?</p>
          </form>
        </div>

        <span className="login-right__footer">
          © 2026 TRACE — Tous droits réservés
        </span>
      </main>
    </div>
  );
}
