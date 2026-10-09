import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { MetricCard } from '../components/MetricCard'
import { SubscriptionPricing } from '../components/SubscriptionPricing'
import { useAuth } from '../auth/AuthContext'

const money = (value) =>
  `৳${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateTime = (value) => new Date(value).toLocaleString('en-BD')

export function OperationsDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({
    analytics: null,
    sales: [],
    users: [],
    investmentRequests: [],
    productProfits: [],
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [approvingId, setApprovingId] = useState(null)
  const [deletingRequestId, setDeletingRequestId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creatingStaff, setCreatingStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'MANAGER',
  })

  const load = useCallback(async () => {
    try {
      const [analytics, sales, users, investmentRequests, productProfits] = await Promise.all([
        apiRequest('/analytics/operations'),
        apiRequest('/sales'),
        apiRequest('/users'),
        user.role === 'OWNER' ? apiRequest('/investments/requests/pending') : Promise.resolve([]),
        user.role === 'OWNER' ? apiRequest('/product-profits') : Promise.resolve([]),
      ])
      setData({ analytics, sales, users, investmentRequests, productProfits })
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [user.role])

  useEffect(() => {
    load()
  }, [load])

  async function approveInvestment(request) {
    if (!window.confirm(`Approve ${money(request.amount)} from ${request.investorName}?`)) return
    setApprovingId(request.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/investments/requests/${request.id}/approve`, { method: 'POST' })
      await load()
      window.dispatchEvent(new Event('financial-platform-investments-updated'))
      setNotice(
        `Investment of ${money(request.amount)} approved and added to ${request.investorName}'s history.`,
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setApprovingId(null)
    }
  }

  async function deleteInvestmentRequest(request) {
    if (
      !window.confirm(
        `Delete the pending request of ${money(request.amount)} from ${request.investorName}?`,
      )
    )
      return
    setDeletingRequestId(request.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/investments/requests/${request.id}`, { method: 'DELETE' })
      await load()
      window.dispatchEvent(new Event('financial-platform-investments-updated'))
      setNotice(`The pending investment request from ${request.investorName} was deleted.`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingRequestId(null)
    }
  }

  async function createStaffProfile(event) {
    event.preventDefault()
    setCreatingStaff(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('/users', { method: 'POST', body: JSON.stringify(newStaff) })
      setNewStaff({ fullName: '', email: '', password: '', role: 'MANAGER' })
      await load()
      setNotice(
        `${newStaff.role === 'MANAGER' ? 'Manager' : 'Investor'} profile created under ${user.businessName}.`,
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCreatingStaff(false)
    }
  }

  if (loading) return <p>Loading operations…</p>
  const { analytics, sales, users, investmentRequests, productProfits } = data
  const trackedProductProfit = productProfits.reduce(
    (total, product) => total + Number(product.totalProductProfit),
    0,
  )
  const unitsSold = sales.reduce((sum, sale) => sum + Number(sale.quantity), 0)
  const productTotals = sales.reduce((totals, sale) => {
    totals[sale.itemName] = (totals[sale.itemName] || 0) + Number(sale.quantity)
    return totals
  }, {})
  const topProduct = Object.entries(productTotals).sort((a, b) => b[1] - a[1])[0]
  const now = new Date()
  const hourlySales = Array.from({ length: 7 }, (_, index) => {
    const hourDate = new Date(now)
    hourDate.setHours(now.getHours() - (6 - index), 0, 0, 0)
    const value = sales
      .filter((sale) => {
        const created = new Date(sale.createdAt)
        return (
          created.getFullYear() === hourDate.getFullYear() &&
          created.getMonth() === hourDate.getMonth() &&
          created.getDate() === hourDate.getDate() &&
          created.getHours() === hourDate.getHours()
        )
      })
      .reduce((sum, sale) => sum + Number(sale.total), 0)
    return { label: hourDate.toLocaleTimeString('en-BD', { hour: 'numeric' }), value }
  })
  const peakHourlyRevenue = Math.max(...hourlySales.map((entry) => entry.value), 1)
  const revenue = Number(analytics?.revenue || 0)
  const expenses = Number(analytics?.expenses || 0)
  const netAmount = Number(analytics?.netOperatingAmount ?? revenue - expenses)
  const margin = revenue ? (netAmount / revenue) * 100 : 0
  const healthScore = Math.min(
    100,
    (analytics?.orderCount > 0 ? 30 : 0) +
      (netAmount >= 0 && revenue > 0 ? 30 : 0) +
      (margin >= 20 ? 25 : margin > 0 ? 15 : 0) +
      (Number(analytics?.averageOrderValue || 0) > 0 ? 15 : 0),
  )
  const healthLabel = !revenue
    ? 'Waiting for sales'
    : healthScore >= 80
      ? 'Healthy'
      : healthScore >= 55
        ? 'Stable'
        : 'Needs attention'

  return (
    <div
      className={`page-stack${user.role === 'MANAGER' ? ' manager-dashboard' : ' owner-dashboard'}`}
    >
      <div id="manager-dashboard" className="dashboard-heading">
        <p className="eyebrow">{user.role === 'OWNER' ? 'Owner overview' : 'Operator dashboard'}</p>
        <h1>
          {user.role === 'OWNER'
            ? `Good day, ${user.fullName?.split(' ')[0] || 'Owner'}`
            : 'Today’s operations'}
        </h1>
        <p>
          {user.role === 'OWNER'
            ? 'A clear view of your business performance, capital, people, and priorities.'
            : 'Live POS intake and server-calculated financial indicators.'}
        </p>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {user.role === 'OWNER' && <SubscriptionPricing />}
      {analytics && (
        <section className="metrics-grid" aria-label="Daily metrics">
          <MetricCard label="Revenue" value={money(analytics.revenue)} context={analytics.date} />
          <MetricCard label="Orders" value={analytics.orderCount} />
          {user.role === 'MANAGER' && (
            <MetricCard label="Average order value" value={money(analytics.averageOrderValue)} />
          )}
          <MetricCard label="Daily expenses" value={money(analytics.expenses)} />
        </section>
      )}

      {user.role === 'OWNER' && analytics && (
        <section className="owner-profit-split" aria-label="Owner and investor profit split">
          <article>
            <small>Actual profit</small>
            <strong>{money(trackedProductProfit)}</strong>
            <span>Product sales minus recorded product costs</span>
          </article>
          <article className="owner-profit-share">
            <small>Owner’s profit part (50%)</small>
            <strong>{money(Math.max(0, trackedProductProfit) / 2)}</strong>
            <span>Retained by the business Owner</span>
          </article>
          <article className="investor-profit-share">
            <small>Investors’ profit part (50%)</small>
            <strong>{money(Math.max(0, trackedProductProfit) / 2)}</strong>
            <span>Distributed by investment units and offer limits</span>
          </article>
        </section>
      )}

      {user.role === 'OWNER' && analytics && (
        <section className="owner-health-card" aria-label="Owner business summary">
          <div
            className="owner-health-score"
            style={{ '--health-score': `${healthScore * 3.6}deg` }}
          >
            <span>
              <strong>{healthScore}</strong>
              <small>Business score</small>
            </span>
          </div>
          <div className="owner-health-copy">
            <p className="eyebrow">Business health today</p>
            <h2>{healthLabel}</h2>
            <p>
              {revenue
                ? `Your business has generated ${money(revenue)} in revenue with ${money(netAmount)} remaining after expenses.`
                : 'Your dashboard will become more detailed as sales and expenses are recorded.'}
            </p>
          </div>
          <div className="owner-health-facts">
            <span>
              <small>Net position</small>
              <strong>{money(netAmount)}</strong>
            </span>
            <span>
              <small>Profit margin</small>
              <strong>{margin.toFixed(1)}%</strong>
            </span>
            <span>
              <small>Units sold</small>
              <strong>{unitsSold}</strong>
            </span>
          </div>
        </section>
      )}

      {user.role === 'OWNER' && (
        <section className="owner-quick-section" aria-label="Owner quick actions">
          <div className="owner-section-heading">
            <div>
              <p className="eyebrow">Quick access</p>
              <h2>Run your business</h2>
            </div>
            <p>Common owner tasks, grouped in one place.</p>
          </div>
          <div className="owner-quick-grid">
            <Link to="/pos">
              <span>▣</span>
              <div>
                <strong>Record a sale</strong>
                <small>Open the point of sale</small>
              </div>
              <b>→</b>
            </Link>
            <Link to="/expenses">
              <span>৳</span>
              <div>
                <strong>Add an expense</strong>
                <small>Track business spending</small>
              </div>
              <b>→</b>
            </Link>
            <Link to="/accounting/journal">
              <span>⇄</span>
              <div>
                <strong>Review accounts</strong>
                <small>See money in and money out</small>
              </div>
              <b>→</b>
            </Link>
            <Link to="/team">
              <span>♟</span>
              <div>
                <strong>Manage the team</strong>
                <small>Employees, shifts and details</small>
              </div>
              <b>→</b>
            </Link>
          </div>
        </section>
      )}

      {user.role === 'MANAGER' && analytics && (
        <section className="business-health-panel panel" aria-label="Business health">
          <div
            className="health-score-ring"
            style={{ '--health-score': `${healthScore * 3.6}deg` }}
          >
            <span>
              <strong>{healthScore}</strong>
              <small>/100</small>
            </span>
          </div>
          <div className="health-summary">
            <p className="eyebrow">Business health today</p>
            <h2>{healthLabel}</h2>
            <p>
              This operational score combines sales activity, positive cash position, margin, and
              order value.
            </p>
            <div className="health-status-row">
              <span className={analytics.orderCount ? 'good' : ''}>
                Orders <strong>{analytics.orderCount ? 'Active' : 'None yet'}</strong>
              </span>
              <span className={netAmount >= 0 && revenue ? 'good' : 'warning'}>
                Cash position <strong>{money(netAmount)}</strong>
              </span>
              <span className={margin > 0 ? 'good' : 'warning'}>
                Margin <strong>{margin.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
          <Link className="health-analytics-link" to="/manager/analytics">
            View detailed analytics <span>→</span>
          </Link>
        </section>
      )}

      {user.role === 'MANAGER' && analytics && (
        <section className="manager-command-center" aria-label="Manager performance overview">
          <div className="manager-performance-card">
            <div className="manager-card-heading">
              <div>
                <p className="eyebrow">Live performance</p>
                <h2>Sales activity</h2>
              </div>
              <span>
                <i /> Live
              </span>
            </div>
            <div className="manager-hour-chart" aria-label="Revenue during the last seven hours">
              {hourlySales.map((entry) => (
                <div key={entry.label} title={`${entry.label}: ${money(entry.value)}`}>
                  <span
                    style={{
                      height: `${Math.max((entry.value / peakHourlyRevenue) * 100, entry.value ? 12 : 4)}%`,
                    }}
                  />
                  <small>{entry.label}</small>
                </div>
              ))}
            </div>
            <p className="manager-chart-caption">
              Revenue movement across the latest seven hourly periods.
            </p>
          </div>
          <div className="manager-insight-stack">
            <article>
              <span aria-hidden="true">✦</span>
              <div>
                <small>Top product today</small>
                <strong>{topProduct?.[0] || 'Waiting for sales'}</strong>
                <p>
                  {topProduct
                    ? `${topProduct[1]} units sold`
                    : 'It will appear after the first order.'}
                </p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">↗</span>
              <div>
                <small>Operational pulse</small>
                <strong>{unitsSold} total units</strong>
                <p>
                  {sales.length
                    ? `${(unitsSold / sales.length).toFixed(1)} units per order on average.`
                    : 'No orders recorded yet.'}
                </p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">◎</span>
              <div>
                <small>Manager focus</small>
                <strong>
                  {analytics.orderCount ? 'Sales are active' : 'Ready for the first sale'}
                </strong>
                <p>Monitor POS entries and keep product information accurate.</p>
              </div>
            </article>
          </div>
        </section>
      )}

      {user.role === 'OWNER' && (
        <section className="panel notification-panel" id="investment-requests">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Needs your decision</p>
              <h2>Investment requests</h2>
            </div>
            <span
              className="notification-count"
              aria-label={`${investmentRequests.length} pending requests`}
            >
              {investmentRequests.length}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Investor</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {investmentRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{dateTime(request.requestedAt)}</td>
                    <td>{request.investorName}</td>
                    <td>{request.investorEmail}</td>
                    <td>{money(request.amount)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="table-action"
                          disabled={approvingId === request.id || deletingRequestId === request.id}
                          onClick={() => approveInvestment(request)}
                        >
                          {approvingId === request.id ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="danger table-action"
                          disabled={approvingId === request.id || deletingRequestId === request.id}
                          onClick={() => deleteInvestmentRequest(request)}
                        >
                          {deletingRequestId === request.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {investmentRequests.length === 0 && (
                  <tr>
                    <td colSpan="5">No pending investment requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {user.role === 'OWNER' && (
        <section className="panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Access management</p>
              <h2>Managers and investors</h2>
            </div>
            <Link className="secondary table-action" to="/team">
              View employees
            </Link>
          </div>
          <p>Create login access only when a new manager or investor joins the business.</p>
          <details className="owner-create-account">
            <summary>+ Create a manager or investor account</summary>
            <form className="staff-create-form" onSubmit={createStaffProfile}>
              <label>
                Full name
                <input
                  required
                  maxLength="120"
                  value={newStaff.fullName}
                  onChange={(event) => setNewStaff({ ...newStaff, fullName: event.target.value })}
                />
              </label>
              <label>
                Login email
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(event) => setNewStaff({ ...newStaff, email: event.target.value })}
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  required
                  minLength="8"
                  maxLength="72"
                  value={newStaff.password}
                  onChange={(event) => setNewStaff({ ...newStaff, password: event.target.value })}
                />
              </label>
              <label>
                Access role
                <select
                  value={newStaff.role}
                  onChange={(event) => setNewStaff({ ...newStaff, role: event.target.value })}
                >
                  <option value="MANAGER">Manager</option>
                  <option value="INVESTOR">Investor</option>
                </select>
              </label>
              <button type="submit" disabled={creatingStaff}>
                {creatingStaff ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </details>
        </section>
      )}

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">People</p>
            <h2>{user.businessName} directory</h2>
          </div>
          <span className="owner-muted-count">{users.length} accounts</span>
        </div>
        <ul className="staff-list">
          {users.map((staff) => (
            <li key={staff.id}>
              <div>
                <strong>{staff.fullName}</strong>
                <span>{staff.email || 'Login email visible to Owner only'}</span>
              </div>
              <div className="staff-directory-actions">
                <span className="role-label">{staff.role}</span>
                {user.role === 'OWNER' && staff.role !== 'OWNER' && (
                  <Link className="secondary table-action" to={`/profile/${staff.id}`}>
                    Manage profile
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
