import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CalendarX,
  FolderOpen,
  Megaphone,
  CalendarDays,
  Users,
  Link2,
  BookOpenCheck,
  LockKeyhole,
  MonitorCheck,
  BarChart2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import './DashboardLayout.css';

/* ── Navigation menus per role ── */
const teacherNav = [
  { to: '/teacher/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/teacher/notes',     label: 'Notes',           icon: FileText },
  { to: '/teacher/absences',  label: 'Absences',        icon: CalendarX },
  { to: '/teacher/supports',  label: 'Supports',        icon: FolderOpen },
  { to: '/teacher/annonces',  label: 'Annonces',        icon: Megaphone },
  { to: '/teacher/emploi',    label: 'Emploi du temps',  icon: CalendarDays },
  { to: '/teacher/bilan',     label: 'Délibérations',  icon: BarChart2 },
  { to: '/teacher/responsable', label: 'Coordination', icon: ShieldCheck },
];

const agentNav = [
  { to: '/agent/dashboard',     label: 'Tableau de bord',       icon: LayoutDashboard },
  { to: '/agent/enseignants',   label: 'Enseignants',           icon: Users },
  { to: '/agent/affectations',  label: 'Affectations',          icon: Link2 },
  { to: '/agent/parametrage',    label: 'Paramétrage des modules', icon: BookOpenCheck },
  { to: '/agent/periodes',      label: 'Périodes de saisie',    icon: LockKeyhole },
  { to: '/agent/supervision',   label: 'Supervision cours',     icon: MonitorCheck },
  { to: '/agent/emploi',        label: 'Emploi du temps',       icon: CalendarDays },
  { to: '/agent/bilan',         label: 'Délibérations',      icon: BarChart2 },
];

/* ── Page title helper ── */
function usePageTitle(navItems) {
  const { pathname } = useLocation();
  const match = navItems.find((item) => pathname.startsWith(item.to));
  return match?.label || 'Tableau de bord';
}

/* ── Initials helper ── */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = role === 'agent' ? agentNav : teacherNav;
  const pageTitle = usePageTitle(navItems);
  const isAgent = role === 'agent';
  const roleSuffix = isAgent ? '--agent' : '--teacher';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const displayName = user?.nom_complet || user?.email || 'Utilisateur';
  const roleLabel = isAgent ? 'Agent Péd.' : 'Enseignant';

  return (
    <div className="dashboard">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <span className="cross-h" />
            <span className="cross-v" />
            <span className="dot" />
          </div>
          <span className="sidebar__brand">TRACE</span>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className={`sidebar__avatar sidebar__avatar${roleSuffix}`}>
            {getInitials(displayName)}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{displayName}</span>
            <span className="sidebar__user-role">{roleLabel}</span>
          </div>
          <button
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="dashboard__main">
        {/* Navbar */}
        <header className="navbar">
          <span className="navbar__title">{pageTitle}</span>
          <div className="navbar__actions">
            <div className="navbar__user-pill">
              <div className={`navbar__user-pill-avatar navbar__user-pill-avatar${roleSuffix}`}>
                {getInitials(displayName)}
              </div>
              <span className="navbar__user-pill-name">
                {displayName.split(' ').pop()}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
