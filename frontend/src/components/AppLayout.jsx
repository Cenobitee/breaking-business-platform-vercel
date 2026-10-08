import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ChatWidget } from './ChatWidget'
import { TeamQuickTools } from '../pages/TeamStructurePage'

const moneyForNavigation = (value) =>
  `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`

export function AppLayout() {
  const { user, logout } = useAuth()
  const isOwner = user.role === 'OWNER'
  const isManager = user.role === 'MANAGER'
  const isInvestor = user.role === 'INVESTOR'
  const roleTitle = isOwner ? 'Business Owner' : isManager ? 'Operations Manager' : 'Investor'
  const homePath = isInvestor ? '/investor' : '/operations'
  const [pendingInvestments, setPendingInvestments] = useState(0)
  const [stockAlerts, setStockAlerts] = useState([])
  const [businessProfile, setBusinessProfile] = useState(null)
  const [personalProfile, setPersonalProfile] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [investorCycles, setInvestorCycles] = useState([])
  const notificationMenuRef = useRef(null)

  const refreshProfile = useCallback(async () => {
    try {
      setBusinessProfile(await apiRequest('/business'))
    } catch {
      /* Profile page displays errors. */
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!['OWNER', 'MANAGER'].includes(user.role)) return
    try {
      const [products, requests] = await Promise.all([
        apiRequest('/products'),
        user.role === 'OWNER' ? apiRequest('/investments/requests/pending') : Promise.resolve([]),
      ])
      setStockAlerts(
        products.filter((product) => product.stockQuantity <= product.lowStockThreshold),
      )
      setPendingInvestments(requests.length)
    } catch {
      // Page-level requests display authorization or connectivity errors.
    }
  }, [user.role])

  useEffect(() => {
    refreshProfile()
    window.addEventListener('business-profile-updated', refreshProfile)
    return () => window.removeEventListener('business-profile-updated', refreshProfile)
  }, [refreshProfile])

  useEffect(() => {
    const refreshPersonalProfile = () =>
      apiRequest('/profile/me')
        .then(setPersonalProfile)
        .catch(() => {})
    refreshPersonalProfile()
    window.addEventListener('financial-platform-user-profile-updated', refreshPersonalProfile)
    return () =>
      window.removeEventListener('financial-platform-user-profile-updated', refreshPersonalProfile)
  }, [])

  useEffect(() => {
    if (!['OWNER', 'MANAGER'].includes(user.role)) return undefined
    refreshNotifications()
    const intervalId = window.setInterval(refreshNotifications, 10000)
    window.addEventListener('financial-platform-investments-updated', refreshNotifications)
    window.addEventListener('financial-platform-stock-updated', refreshNotifications)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('financial-platform-investments-updated', refreshNotifications)
      window.removeEventListener('financial-platform-stock-updated', refreshNotifications)
    }
  }, [refreshNotifications, user.role])

  useEffect(() => {
    if (!isInvestor) return undefined
    const refreshInvestments = () =>
      apiRequest('/investments/me')
        .then((data) => setInvestorCycles(data.cycles || []))
        .catch(() => {})
    refreshInvestments()
    const intervalId = window.setInterval(refreshInvestments, 10000)
    window.addEventListener('financial-platform-investments-updated', refreshInvestments)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('financial-platform-investments-updated', refreshInvestments)
    }
  }, [isInvestor])

  useEffect(() => {
    function closeNotifications(event) {
      if (
        event.key === 'Escape' ||
        (event.type === 'mousedown' && !notificationMenuRef.current?.contains(event.target))
      )
        setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', closeNotifications)
    document.addEventListener('keydown', closeNotifications)
    return () => {
      document.removeEventListener('mousedown', closeNotifications)
      document.removeEventListener('keydown', closeNotifications)
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="manager-layout">
        <aside
          className={`manager-sidebar${mobileNavigationOpen ? ' mobile-open' : ''}`}
          aria-label={`${roleTitle} navigation`}
          id="mobile-workspace-navigation"
        >
          <Link className="manager-workspace" to={homePath} aria-label="Open dashboard">
            <span className="manager-workspace-logo" aria-hidden="true">
              {businessProfile?.logoDataUrl ? (
                <img src={businessProfile.logoDataUrl} alt="" />
              ) : (
                'BB'
              )}
            </span>
            <div>
              <small>Team workspace</small>
              <strong>{businessProfile?.name || user.businessName || 'Business'}</strong>
            </div>
          </Link>

          <p className="manager-nav-label">{isOwner ? 'Owner workspace' : 'Navigation'}</p>
          <nav className="manager-side-nav" onClick={() => setMobileNavigationOpen(false)}>
            {!isInvestor && (
              <NavLink to="/operations" end>
                <span aria-hidden="true">⌂</span>Dashboard
              </NavLink>
            )}
            {isInvestor && (
              <NavLink to="/investor" end>
                <span aria-hidden="true">⌂</span>Investor dashboard
              </NavLink>
            )}
            {isInvestor && (
              <NavLink to="/investor/investments">
                <span aria-hidden="true">＋</span>Investments
              </NavLink>
            )}
            {isInvestor && (
              <NavLink to="/investor/history">
                <span aria-hidden="true">≡</span>History
              </NavLink>
            )}
            {isInvestor && investorCycles.length > 0 && (
              <p className="manager-nav-label manager-nav-section-label">My investments</p>
            )}
            {isInvestor &&
              investorCycles.map((cycle) => (
                <NavLink
                  key={cycle.id}
                  to={`/investor/investments/${cycle.id}`}
                  className="investor-cycle-nav-link"
                >
                  <span aria-hidden="true">◉</span>
                  <div>
                    <strong>{cycle.projectName}</strong>
                    <small>{moneyForNavigation(cycle.principal)}</small>
                  </div>
                </NavLink>
              ))}
            {!isInvestor && (
              <NavLink to="/pos">
                <span aria-hidden="true">▣</span>Point of sale
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/orders">
                <span aria-hidden="true">≡</span>Order history
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/expenses">
                <span aria-hidden="true">৳</span>Expenses
              </NavLink>
            )}
            {isOwner && <p className="manager-nav-label manager-nav-section-label">Ownership</p>}
            {isOwner && (
              <NavLink to="/product-profit">
                <span aria-hidden="true">↗</span>Product profit
              </NavLink>
            )}
            {isOwner && (
              <NavLink to="/investors">
                <span aria-hidden="true">♟</span>Investor profiles
              </NavLink>
            )}
            {isOwner && (
              <NavLink to="/investment-management">
                <span aria-hidden="true">৳</span>Investment management
              </NavLink>
            )}
            {isOwner && (
              <NavLink to="/investor">
                <span aria-hidden="true">◉</span>Manage investment
              </NavLink>
            )}
            {!isInvestor && (
              <p className="manager-nav-label manager-nav-section-label">Accounting center</p>
            )}
            {!isInvestor && (
              <NavLink to="/accounting/journal">
                <span aria-hidden="true">⇄</span>Money journal
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/accounting/break-even">
                <span aria-hidden="true">◎</span>Break-even
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/accounting/budgets">
                <span aria-hidden="true">▦</span>Budget check
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/manager/analytics">
                <span aria-hidden="true">▥</span>Analytics
              </NavLink>
            )}
            {isOwner && (
              <p className="manager-nav-label manager-nav-section-label">
                People &amp; communication
              </p>
            )}
            {!isInvestor && (
              <NavLink to="/team">
                <span aria-hidden="true">♟</span>Team structure
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/manager/reports">
                <span aria-hidden="true">▤</span>Reports <small>Live</small>
              </NavLink>
            )}
            {!isInvestor && (
              <NavLink to="/support">
                <span aria-hidden="true">?</span>Support <small>Live</small>
              </NavLink>
            )}
          </nav>

          <div className="manager-sidebar-bottom">
            <NavLink className="manager-settings-link" to="/business">
              <span aria-hidden="true">⚙</span>Settings
            </NavLink>
            <p className="manager-nav-label">User account</p>
            <div className="manager-account">
              <Link className="manager-account-profile" to="/profile">
                <span className="manager-avatar" aria-hidden="true">
                  {personalProfile?.profileImageDataUrl ? (
                    <img src={personalProfile.profileImageDataUrl} alt="" />
                  ) : (
                    user.fullName?.slice(0, 1).toUpperCase() || 'M'
                  )}
                </span>
                <div>
                  <strong>{personalProfile?.fullName || user.fullName}</strong>
                  <small>{roleTitle}</small>
                </div>
              </Link>
            </div>
          </div>
        </aside>
        {mobileNavigationOpen && (
          <button
            className="mobile-navigation-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavigationOpen(false)}
          />
        )}
        <div className="manager-content-column">
          <header className="manager-utility-header">
            <button
              className="mobile-navigation-toggle"
              type="button"
              aria-label={mobileNavigationOpen ? 'Close navigation' : 'Open navigation'}
              aria-controls="mobile-workspace-navigation"
              aria-expanded={mobileNavigationOpen}
              onClick={() => setMobileNavigationOpen((open) => !open)}
            >
              <span aria-hidden="true">{mobileNavigationOpen ? '×' : '☰'}</span>
            </button>
            <div className="manager-header-context">
              <small>Workspace</small>
              <strong>{businessProfile?.name || user.businessName || 'Business'}</strong>
            </div>
            <div className="manager-header-actions">
              <button className="manager-header-logout" type="button" onClick={logout}>
                <span aria-hidden="true">↪</span> Logout
              </button>
              {!isInvestor && (
                <div className="manager-notification-menu" ref={notificationMenuRef}>
                  <button
                    type="button"
                    className={`manager-notification-bell${stockAlerts.length ? ' has-alerts' : ''}`}
                    title={
                      stockAlerts.length
                        ? `${stockAlerts.length} stock warning${stockAlerts.length === 1 ? '' : 's'}`
                        : 'No stock warnings'
                    }
                    aria-label={
                      stockAlerts.length
                        ? `${stockAlerts.length} stock warnings`
                        : 'No stock warnings'
                    }
                    aria-expanded={notificationsOpen}
                    onClick={() => setNotificationsOpen((open) => !open)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                      <path d="M10 21h4" />
                    </svg>
                    {stockAlerts.length + (isOwner ? pendingInvestments : 0) > 0 && (
                      <strong>{stockAlerts.length + (isOwner ? pendingInvestments : 0)}</strong>
                    )}
                  </button>
                  {notificationsOpen && (
                    <aside
                      className="manager-notification-popover"
                      role="dialog"
                      aria-label="Inventory notifications"
                    >
                      <p className="eyebrow">Inventory notification</p>
                      <h2>Stock needs attention</h2>
                      <div className="manager-notification-list">
                        {stockAlerts.map((product) => (
                          <div key={product.id}>
                            <strong>{product.name}</strong>
                            <span>
                              {product.stockQuantity === 0
                                ? 'Out of stock'
                                : `Only ${product.stockQuantity} left`}
                            </span>
                          </div>
                        ))}
                        {isOwner && pendingInvestments > 0 && (
                          <Link
                            to="/operations#investment-requests"
                            onClick={() => setNotificationsOpen(false)}
                          >
                            <strong>Investment requests</strong>
                            <span>{pendingInvestments} waiting for your review</span>
                          </Link>
                        )}
                        {!stockAlerts.length && !(isOwner && pendingInvestments) && (
                          <p>No notifications right now.</p>
                        )}
                      </div>
                    </aside>
                  )}
                </div>
              )}
              <Link className="manager-header-account" to="/profile">
                <span>
                  {personalProfile?.profileImageDataUrl ? (
                    <img src={personalProfile.profileImageDataUrl} alt="" />
                  ) : (
                    user.fullName?.slice(0, 1).toUpperCase() || 'M'
                  )}
                </span>
                <div>
                  <strong>{personalProfile?.fullName || user.fullName}</strong>
                  <small>{roleTitle}</small>
                </div>
              </Link>
            </div>
          </header>
          <main className="page-container manager-page-container">
            <Outlet />
          </main>
        </div>
      </div>
      {!isInvestor && <TeamQuickTools />}
      <ChatWidget />
    </div>
  )
}
