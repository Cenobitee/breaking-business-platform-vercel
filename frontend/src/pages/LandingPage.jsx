import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { SubscriptionPricing } from '../components/SubscriptionPricing'

function dashboardFor(role) {
  return role === 'INVESTOR' ? '/investor' : '/operations'
}

export function LandingPage() {
  const { user } = useAuth()

  return (
    <main className="landing-page">
      <section className="landing-hero" id="home">
        <header className="landing-nav" aria-label="Main navigation">
          <Link className="landing-brand" to="/" aria-label="Breaking Business home">
            <img src="/breaking-business-logo.png" alt="" />
            Breaking Business
          </Link>
          <nav>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#roles">Roles</a>
            <a href="#about">About</a>
          </nav>
          <Link className="landing-login" to={user ? dashboardFor(user.role) : '/login'}>
            {user ? 'Dashboard' : 'Login'}
          </Link>
        </header>

        <div className="landing-hero-copy">
          <p className="landing-kicker">
            <span /> One platform. Complete clarity.
          </p>
          <h1>
            Run your business
            <br />
            with confidence.
          </h1>
          <p className="landing-subtitle">
            Sales, investments, people, and financial insights—connected in one secure workspace.
          </p>
          <div className="landing-actions">
            <Link
              className="landing-primary-action"
              to={user ? dashboardFor(user.role) : '/signup'}
            >
              {user ? 'Open dashboard' : 'Get started'} <span aria-hidden="true">→</span>
            </Link>
            <a className="landing-text-action" href="#features">
              Explore features
            </a>
          </div>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="visual-sun" />
          <div className="visual-hill visual-hill-back" />
          <div className="visual-hill visual-hill-front" />
          <div className="visual-dashboard-card">
            <div className="visual-card-heading">
              <span>Financial overview</span>
              <small>LIVE</small>
            </div>
            <strong>৳128,540</strong>
            <div className="visual-chart">
              <i style={{ height: '35%' }} />
              <i style={{ height: '52%' }} />
              <i style={{ height: '46%' }} />
              <i style={{ height: '72%' }} />
              <i style={{ height: '63%' }} />
              <i style={{ height: '88%' }} />
              <i style={{ height: '100%' }} />
            </div>
          </div>
          <div className="visual-pill visual-pill-sales">
            Live sales <strong>+18.4%</strong>
          </div>
          <div className="visual-pill visual-pill-secure">● Secure role access</div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <p className="landing-section-label">Everything connected</p>
        <h2>A clearer way to operate</h2>
        <p className="landing-section-intro">
          The tools you need to record activity, understand performance, and keep every stakeholder
          informed.
        </p>
        <div className="landing-feature-grid">
          <article>
            <span className="feature-icon">↗</span>
            <h3>Live sales</h3>
            <p>Record POS transactions and watch revenue metrics update as your business moves.</p>
          </article>
          <article>
            <span className="feature-icon">◎</span>
            <h3>Investor clarity</h3>
            <p>
              Give investors a transparent, read-only view of capital health, requests, and history.
            </p>
          </article>
          <article>
            <span className="feature-icon">◇</span>
            <h3>Business control</h3>
            <p>
              Manage your business profile, staff accounts, approvals, and access from one place.
            </p>
          </article>
        </div>
      </section>

      <div className="landing-pricing" id="pricing">
        <SubscriptionPricing />
      </div>

      <section className="landing-roles" id="roles">
        <div>
          <p className="landing-section-label">Built for your whole team</p>
          <h2>The right information for every role.</h2>
          <p>
            Owners stay in control, managers run daily operations, and investors see the financial
            information that matters to them.
          </p>
        </div>
        <div className="role-list">
          <article>
            <span>01</span>
            <div>
              <h3>Owner</h3>
              <p>Full business oversight and account management.</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Manager</h3>
              <p>POS operations, analytics, and staff visibility.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Investor</h3>
              <p>Capital transparency and investment requests.</p>
            </div>
          </article>
        </div>
      </section>

      <footer className="landing-footer" id="about">
        <div>
          <Link className="landing-brand" to="/">
            <img src="/breaking-business-logo.png" alt="" />
            Breaking Business
          </Link>
          <p>Financial operations made transparent.</p>
        </div>
        <div className="landing-footer-actions">
          <Link to="/signup">Create an Owner profile</Link>
          <Link to="/login">Login</Link>
        </div>
      </footer>
    </main>
  )
}
