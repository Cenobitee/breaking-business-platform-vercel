import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const money = (value) =>
  `৳${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const percent = (value) => `${Number(value).toFixed(2)}%`
const dateTime = (value) => (value ? new Date(value).toLocaleString('en-BD') : '—')
const MAX_INVESTMENT_IMAGE_PAYLOAD_BYTES = 3_500_000
const dataUrlBytes = (value) => {
  const base64 = value?.split(',')[1] || ''
  return Math.ceil(base64.length * 0.75)
}
const totalImageBytes = (images) => images.reduce((total, image) => total + dataUrlBytes(image), 0)
const imagePayloadIsTooLarge = (images) =>
  totalImageBytes(images) > MAX_INVESTMENT_IMAGE_PAYLOAD_BYTES
const oversizedImageMessage =
  'The combined images are too large. Remove an image or use smaller images and try again.'

export function InvestorDashboard({ view = 'overview' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isInvestor = user.role === 'INVESTOR'
  const [analytics, setAnalytics] = useState(null)
  const [investments, setInvestments] = useState(null)
  const [packages, setPackages] = useState([])
  const [products, setProducts] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [changingVisibilityId, setChangingVisibilityId] = useState(null)
  const [editingPackage, setEditingPackage] = useState(null)
  const [viewingPackage, setViewingPackage] = useState(null)
  const [bookingPackage, setBookingPackage] = useState(null)
  const [newPackageImages, setNewPackageImages] = useState([])
  const [editingPackageImages, setEditingPackageImages] = useState([])
  const [cropSource, setCropSource] = useState(null)
  const [cropTarget, setCropTarget] = useState(null)
  const [cropQueue, setCropQueue] = useState([])
  const [cropZoom, setCropZoom] = useState(1)
  const [cropX, setCropX] = useState(50)
  const [cropY, setCropY] = useState(50)
  const [deletingPackageId, setDeletingPackageId] = useState(null)

  const load = useCallback(async () => {
    try {
      const [analyticsData, investmentData, packageData, productData] = await Promise.all([
        apiRequest('/analytics/investor'),
        isInvestor ? apiRequest('/investments/me') : Promise.resolve(null),
        apiRequest('/investments/packages'),
        isInvestor ? Promise.resolve([]) : apiRequest('/products'),
      ])
      setAnalytics(analyticsData)
      setInvestments(investmentData)
      setPackages(packageData)
      setProducts(productData)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [isInvestor])

  useEffect(() => {
    load()
    const intervalId = window.setInterval(load, 10000)
    return () => window.clearInterval(intervalId)
  }, [load])

  useEffect(() => {
    if (location.state?.paymentNotice) {
      setNotice(location.state.paymentNotice)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  function openOpportunity(investmentPackage) {
    setViewingPackage(investmentPackage)
    setQuantity(1)
  }

  function continueFromOpportunity() {
    if (
      !quantity ||
      quantity < 1 ||
      quantity > Math.min(viewingPackage.remainingUnits, viewingPackage.maxUnitsPerInvestor)
    ) {
      setError('Choose a valid quantity before continuing.')
      return
    }
    navigate('/investor/payment', {
      state: { investmentPackage: viewingPackage, quantity },
    })
  }

  function openBooking(investmentPackage) {
    setBookingPackage(investmentPackage)
    setQuantity(1)
  }

  function confirmBooking(event) {
    event.preventDefault()
    const maximum = Math.min(bookingPackage.remainingUnits, bookingPackage.maxUnitsPerInvestor)
    if (!quantity || quantity < 1 || quantity > maximum) {
      setError('Choose a valid quantity before continuing.')
      return
    }
    navigate('/investor/payment', {
      state: { investmentPackage: bookingPackage, quantity },
    })
  }

  function showCropItem(item, remainingItems) {
    setCropSource(item.source)
    setCropTarget(item.target)
    setCropQueue(remainingItems)
    setCropZoom(1)
    setCropX(50)
    setCropY(50)
  }

  async function selectInvestmentImages(event, target) {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return
    const currentCount = target === 'new' ? newPackageImages.length : editingPackageImages.length
    if (currentCount + selectedFiles.length > 6) {
      setError('You can add up to 6 images to one investment post.')
      event.target.value = ''
      return
    }
    if (
      selectedFiles.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    ) {
      setError('Choose a PNG, JPEG, or WebP image.')
      event.target.value = ''
      return
    }
    if (selectedFiles.some((file) => file.size > 900 * 1024)) {
      setError('Each investment image must be smaller than 900 KB.')
      event.target.value = ''
      return
    }
    const items = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve({ source: reader.result, target })
            reader.readAsDataURL(file)
          }),
      ),
    )
    showCropItem(items[0], items.slice(1))
    setError('')
    event.target.value = ''
  }

  function closeImageCropper() {
    setCropSource(null)
    setCropTarget(null)
    setCropQueue([])
  }

  function advanceImageCropper() {
    if (!cropQueue.length) {
      closeImageCropper()
      return
    }
    showCropItem(cropQueue[0], cropQueue.slice(1))
  }

  function applyImageCrop() {
    const image = new Image()
    image.onload = () => {
      const outputWidth = 960
      const outputHeight = 540
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight
      const context = canvas.getContext('2d')
      const coverScale = Math.max(outputWidth / image.width, outputHeight / image.height)
      const scale = coverScale * cropZoom
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const drawX = -(drawWidth - outputWidth) * (cropX / 100)
      const drawY = -(drawHeight - outputHeight) * (cropY / 100)
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      const croppedImage = canvas.toDataURL('image/jpeg', 0.78)
      const currentImages = cropTarget === 'new' ? newPackageImages : editingPackageImages
      if (imagePayloadIsTooLarge([...currentImages, croppedImage])) {
        setError(oversizedImageMessage)
        advanceImageCropper()
        return
      }
      if (cropTarget === 'new') setNewPackageImages((images) => [...images, croppedImage])
      if (cropTarget === 'edit') setEditingPackageImages((images) => [...images, croppedImage])
      advanceImageCropper()
    }
    image.onerror = () => setError('The selected image could not be cropped.')
    image.src = cropSource
  }

  function openPackageEditor(investmentPackage) {
    setEditingPackage(investmentPackage)
    setEditingPackageImages(
      investmentPackage.imageDataUrls?.length
        ? investmentPackage.imageDataUrls
        : investmentPackage.imageDataUrl
          ? [investmentPackage.imageDataUrl]
          : [],
    )
  }

  async function updatePackage(investmentPackage, form) {
    setError('')
    setNotice('')
    if (imagePayloadIsTooLarge(editingPackageImages)) {
      setError(oversizedImageMessage)
      return
    }
    try {
      await apiRequest(`/investments/packages/${investmentPackage.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: Number(form.amount.value),
          earningMinPercentage: Number(form.minimum.value),
          earningMaxPercentage: Number(form.maximum.value),
          durationMonths: Number(form.duration.value),
          totalUnits: Number(form.units.value),
          maxUnitsPerInvestor: Number(form.maxUnitsPerInvestor.value),
          projectName: form.projectName.value,
          purpose: form.purpose.value,
          imageDataUrl: editingPackageImages[0] || null,
          imageDataUrls: editingPackageImages,
          fundingTarget: Number(form.fundingTarget.value),
          productIds: Array.from(form.querySelectorAll('input[name="productIds"]:checked')).map(
            (input) => Number(input.value),
          ),
          active: investmentPackage.active,
        }),
      })
      setNotice(`${money(investmentPackage.amount)} unit offer updated.`)
      await load()
      setEditingPackage(null)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function publishPackage(event) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setNotice('')
    if (imagePayloadIsTooLarge(newPackageImages)) {
      setError(oversizedImageMessage)
      return
    }
    setPublishing(true)
    try {
      await apiRequest('/investments/packages', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount.value),
          earningMinPercentage: Number(form.minimum.value),
          earningMaxPercentage: Number(form.maximum.value),
          durationMonths: Number(form.duration.value),
          totalUnits: Number(form.units.value),
          maxUnitsPerInvestor: Number(form.maxUnitsPerInvestor.value),
          projectName: form.projectName.value,
          purpose: form.purpose.value,
          imageDataUrl: newPackageImages[0] || null,
          imageDataUrls: newPackageImages,
          fundingTarget: Number(form.fundingTarget.value),
          productIds: Array.from(form.querySelectorAll('input[name="productIds"]:checked')).map(
            (input) => Number(input.value),
          ),
          active: form.active.checked,
        }),
      })
      form.reset()
      setNewPackageImages([])
      setNotice('Investment opportunity posted successfully.')
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setPublishing(false)
    }
  }

  async function changePackageVisibility(investmentPackage) {
    setChangingVisibilityId(investmentPackage.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/investments/packages/${investmentPackage.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: investmentPackage.amount,
          earningMinPercentage: investmentPackage.earningMinPercentage,
          earningMaxPercentage: investmentPackage.earningMaxPercentage,
          durationMonths: investmentPackage.durationMonths,
          totalUnits: investmentPackage.totalUnits,
          maxUnitsPerInvestor: investmentPackage.maxUnitsPerInvestor,
          projectName: investmentPackage.projectName,
          purpose: investmentPackage.purpose,
          imageDataUrl: investmentPackage.imageDataUrl,
          imageDataUrls: investmentPackage.imageDataUrls || [],
          fundingTarget: investmentPackage.fundingTarget,
          productIds: investmentPackage.productIds || [],
          active: !investmentPackage.active,
        }),
      })
      setNotice(
        `${investmentPackage.projectName} is now ${investmentPackage.active ? 'inactive and hidden from investors' : 'active and visible to investors'}.`,
      )
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setChangingVisibilityId(null)
    }
  }

  async function deletePackage(investmentPackage) {
    if (!window.confirm(`Delete “${investmentPackage.projectName}”? This cannot be undone.`)) return
    setDeletingPackageId(investmentPackage.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/investments/packages/${investmentPackage.id}`, { method: 'DELETE' })
      setNotice(`${investmentPackage.projectName} was deleted.`)
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingPackageId(null)
    }
  }

  const totalInvested = Number(investments?.totalInvested || 0)
  const approvedCapital = Number(analytics?.initialCapital || 0)
  const netProfit = Number(analytics?.netProfit || 0)
  const capitalShare = approvedCapital > 0 ? (totalInvested / approvedCapital) * 100 : 0
  const pendingRequests = (investments?.requests || []).filter(
    (request) => request.status === 'PENDING',
  )
  const latestRequest = (investments?.requests || [])[0]
  const latestActivity = (investments?.history || [])[0]
  const investmentCycles = investments?.cycles || []
  const pageContent =
    view === 'investments'
      ? {
          eyebrow: 'Investment center',
          title: 'Manage investments',
          description: 'Submit a new investment request and follow its approval status.',
        }
      : view === 'history'
        ? {
            eyebrow: 'Financial records',
            title: 'Investment history',
            description: 'Review the permanent timeline of approved and removed investments.',
          }
        : {
            eyebrow: 'Investor portal',
            title: isInvestor
              ? `Welcome, ${user.fullName?.split(' ')[0] || 'Investor'}`
              : 'Investment packages',
            description: isInvestor
              ? 'Track your capital and the financial progress of the business in one secure place.'
              : 'Create, publish, edit, and manage opportunities shown to investors.',
          }

  return (
    <div className="page-stack investor-dashboard">
      <div className="investor-heading">
        <div>
          <p className="eyebrow">{pageContent.eyebrow}</p>
          <h1>{pageContent.title}</h1>
          <p>{pageContent.description}</p>
        </div>
        <div className="investor-header-actions">
          {isInvestor && (
            <div className="compact-approval-tracker">
              <small>Approval tracker</small>
              <strong>
                {pendingRequests.length
                  ? `${pendingRequests.length} pending`
                  : latestRequest
                    ? latestRequest.status
                    : 'No requests'}
              </strong>
              {latestRequest && <span>{money(latestRequest.amount)}</span>}
            </div>
          )}
          <span className="investor-access-badge">
            <i /> Verified access
          </span>
        </div>
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
      {!analytics && !error && <p>Loading investor analytics…</p>}
      {analytics && (
        <>
          {isInvestor && view === 'overview' && (
            <section className="investor-portfolio-hero" aria-label="Investment portfolio summary">
              <div className="investor-portfolio-main">
                <span>{isInvestor ? 'Your active investment' : 'Approved investor capital'}</span>
                <strong>{money(isInvestor ? totalInvested : approvedCapital)}</strong>
                <p>
                  {isInvestor
                    ? `${capitalShare.toFixed(1)}% of currently approved business capital`
                    : 'Capital currently approved for the business'}
                </p>
              </div>
              <div className="investor-portfolio-stat">
                <span>Business net profit</span>
                <strong className={netProfit < 0 ? 'negative' : ''}>{money(netProfit)}</strong>
                <small>Revenue minus operational expenses</small>
              </div>
              <div className="investor-portfolio-stat">
                <span>Profit margin</span>
                <strong>{percent(analytics.profitMarginPercentage)}</strong>
                <small>Profit earned from every ৳100 of sales</small>
              </div>
              <div className="investor-portfolio-stat">
                <span>Capital health</span>
                <strong>{percent(analytics.capitalHealthPercentage)}</strong>
                <div className="investor-health-track">
                  <i
                    style={{
                      width: `${Math.min(Math.max(Number(analytics.capitalHealthPercentage), 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {isInvestor && view === 'overview' && (
            <section className="panel investment-cycle-panel">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Fixed investment periods</p>
                  <h2>Your investment cycles</h2>
                </div>
                <span className="investor-return-rate">
                  {investmentCycles.length} {investmentCycles.length === 1 ? 'cycle' : 'cycles'}
                </span>
              </div>
              <p>Quick view of your approved investments.</p>
              <div className="investment-cycle-grid">
                {investmentCycles.map((cycle) => {
                  const duration = new Date(cycle.endsAt) - new Date(cycle.startsAt)
                  const elapsed = Date.now() - new Date(cycle.startsAt).getTime()
                  const progress =
                    cycle.status === 'COMPLETED'
                      ? 100
                      : Math.min(100, Math.max(0, (elapsed / duration) * 100))
                  return (
                    <article key={cycle.id} className="investment-cycle-card">
                      <div className="investment-cycle-card-heading">
                        <div>
                          <small>
                            {cycle.status === 'WITHDRAWN'
                              ? 'Return withdrawn'
                              : cycle.status === 'COMPLETED'
                                ? 'Ready to withdraw'
                                : 'Live product-sales estimate'}
                          </small>
                          <strong>{cycle.projectName}</strong>
                          <span>{money(cycle.principal)} invested</span>
                        </div>
                        <span className={`role-label status-${cycle.status.toLowerCase()}`}>
                          {cycle.status}
                        </span>
                      </div>
                      <div
                        className="cycle-progress"
                        aria-label={`${progress.toFixed(0)} percent complete`}
                      >
                        <i style={{ width: `${progress}%` }} />
                      </div>
                      <div className="cycle-compact-date">
                        <span>Matures</span>
                        <strong>{dateTime(cycle.endsAt).split(',')[0]}</strong>
                      </div>
                      <dl className="cycle-compact-metrics">
                        <div>
                          <dt>Live profit</dt>
                          <dd>{money(cycle.investorProfit)}</dd>
                        </div>
                        <div>
                          <dt>Current return</dt>
                          <dd>{money(cycle.settlementTotal)}</dd>
                        </div>
                      </dl>
                      <Link className="cycle-view-details" to={`/investor/investments/${cycle.id}`}>
                        View investment details →
                      </Link>
                    </article>
                  )
                })}
                {investmentCycles.length === 0 && <p>No approved investment cycle yet.</p>}
              </div>
            </section>
          )}

          {isInvestor && view === 'overview' && (
            <section className="investor-business-grid" aria-label="Business performance">
              <article>
                <span>↗</span>
                <div>
                  <small>Total business revenue</small>
                  <strong>{money(analytics.totalRevenue)}</strong>
                  <p>Income generated from recorded sales.</p>
                </div>
              </article>
              <article>
                <span>↘</span>
                <div>
                  <small>Operating expenses</small>
                  <strong>{money(analytics.totalExpenses)}</strong>
                  <p>Recorded costs required to run the business.</p>
                </div>
              </article>
              <article>
                <span>◎</span>
                <div>
                  <small>{isInvestor ? 'Request status' : 'Approved capital'}</small>
                  <strong>
                    {isInvestor ? `${pendingRequests.length} pending` : money(approvedCapital)}
                  </strong>
                  <p>
                    {isInvestor
                      ? pendingRequests.length
                        ? 'Waiting for the Owner’s decision.'
                        : 'No requests waiting for approval.'
                      : 'Visible to investors for transparency.'}
                  </p>
                </div>
              </article>
              <article>
                <span>✓</span>
                <div>
                  <small>Latest portfolio activity</small>
                  <strong>
                    {latestActivity
                      ? dateTime(latestActivity.investedAt).split(',')[0]
                      : 'No activity yet'}
                  </strong>
                  <p>
                    {latestActivity
                      ? `${money(latestActivity.amount)} ${latestActivity.status.toLowerCase()}`
                      : 'Approved investments will appear here.'}
                  </p>
                </div>
              </article>
            </section>
          )}

          {isInvestor && (
            <>
              {view === 'investments' && (
                <section className="investment-opportunities-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Available opportunities</p>
                      <h2>Choose an investment unit</h2>
                    </div>
                    <small>Scroll to view all ↓</small>
                  </div>
                  <div className="investment-project-feed" aria-label="Investment opportunities">
                    {packages.map((investmentPackage) => {
                      return (
                        <article
                          key={investmentPackage.id}
                          className="investment-feed-card"
                          role="button"
                          tabIndex="0"
                          aria-label={`View ${investmentPackage.projectName} details`}
                          onClick={() => openOpportunity(investmentPackage)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openOpportunity(investmentPackage)
                            }
                          }}
                        >
                          <div className="investment-feed-image">
                            {investmentPackage.imageDataUrl ? (
                              <img
                                src={investmentPackage.imageDataUrl}
                                alt={`${investmentPackage.projectName} project`}
                              />
                            ) : (
                              <span>{investmentPackage.projectName.slice(0, 1)}</span>
                            )}
                            <small>Live</small>
                          </div>
                          <div className="investment-feed-summary">
                            <div>
                              <span className="investment-project-type">Live opportunity</span>
                              <h3>{investmentPackage.projectName}</h3>
                              <small>Click to view full project details</small>
                            </div>
                            <dl>
                              <div>
                                <dt>Estimated earnings</dt>
                                <dd>
                                  {percent(investmentPackage.earningMinPercentage)}–
                                  {percent(investmentPackage.earningMaxPercentage)}
                                </dd>
                              </div>
                              <div>
                                <dt>Per unit</dt>
                                <dd>{money(investmentPackage.amount)}</dd>
                              </div>
                              <div>
                                <dt>Duration</dt>
                                <dd>{investmentPackage.durationMonths} months</dd>
                              </div>
                            </dl>
                            <small className="investment-feed-limit">
                              Maximum {investmentPackage.maxUnitsPerInvestor} units per investor
                            </small>
                            <div className="investment-feed-actions">
                              <button
                                type="button"
                                className="secondary"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openOpportunity(investmentPackage)
                                }}
                              >
                                View details
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openBooking(investmentPackage)
                                }}
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                    {!packages.length && (
                      <p className="investment-empty-list">
                        No active investment opportunities are available right now.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {viewingPackage && (
                <div
                  className="investment-opportunity-modal-backdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setViewingPackage(null)
                  }}
                >
                  <section
                    className="investment-opportunity-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="opportunity-detail-title"
                  >
                    {(viewingPackage.imageDataUrls?.length || viewingPackage.imageDataUrl) && (
                      <div className="investment-opportunity-gallery">
                        {(viewingPackage.imageDataUrls?.length
                          ? viewingPackage.imageDataUrls
                          : [viewingPackage.imageDataUrl]
                        ).map((image, index) => (
                          <figure key={`${image.slice(-24)}-${index}`}>
                            <img
                              className="investment-opportunity-hero"
                              src={image}
                              alt={`${viewingPackage.projectName} project ${index + 1}`}
                            />
                            <span>
                              {index + 1} / {viewingPackage.imageDataUrls?.length || 1}
                            </span>
                          </figure>
                        ))}
                      </div>
                    )}
                    <div className="investment-opportunity-content">
                      <div className="investment-opportunity-heading">
                        <div>
                          <span className="investment-project-type">Live opportunity</span>
                          <h2 id="opportunity-detail-title">{viewingPackage.projectName}</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setViewingPackage(null)}
                        >
                          Close
                        </button>
                      </div>
                      <p className="investment-opportunity-description">{viewingPackage.purpose}</p>
                      <div className="investment-project-products">
                        <small>Profit-linked products</small>
                        <strong>
                          {viewingPackage.productNames?.join(', ') ||
                            'Business products specified by owner'}
                        </strong>
                      </div>
                      <dl className="investment-opportunity-facts">
                        {(() => {
                          const minimumProfit =
                            (Number(viewingPackage.amount) *
                              Number(viewingPackage.earningMinPercentage)) /
                            100
                          const maximumProfit =
                            (Number(viewingPackage.amount) *
                              Number(viewingPackage.earningMaxPercentage)) /
                            100
                          return (
                            <>
                              <div>
                                <dt>Investment per unit</dt>
                                <dd>{money(viewingPackage.amount)}</dd>
                              </div>
                              <div>
                                <dt>Estimated earnings</dt>
                                <dd>
                                  {percent(viewingPackage.earningMinPercentage)}–
                                  {percent(viewingPackage.earningMaxPercentage)}
                                </dd>
                              </div>
                              <div>
                                <dt>Estimated profit</dt>
                                <dd>
                                  {money(minimumProfit)}–{money(maximumProfit)}
                                </dd>
                              </div>
                              <div>
                                <dt>Total at maturity</dt>
                                <dd>
                                  {money(Number(viewingPackage.amount) + minimumProfit)}–
                                  {money(Number(viewingPackage.amount) + maximumProfit)}
                                </dd>
                              </div>
                            </>
                          )
                        })()}
                        <div>
                          <dt>Project duration</dt>
                          <dd>{viewingPackage.durationMonths} months</dd>
                        </div>
                        <div>
                          <dt>Units available</dt>
                          <dd>
                            {viewingPackage.remainingUnits} of {viewingPackage.totalUnits}
                          </dd>
                        </div>
                        <div>
                          <dt>Investor purchase limit</dt>
                          <dd>{viewingPackage.maxUnitsPerInvestor} units maximum</dd>
                        </div>
                        <div>
                          <dt>Funding target</dt>
                          <dd>{money(viewingPackage.fundingTarget)}</dd>
                        </div>
                        <div>
                          <dt>Already funded</dt>
                          <dd>{money(viewingPackage.fundedAmount)}</dd>
                        </div>
                      </dl>
                      <section className="investment-distribution-summary">
                        <div>
                          <p className="eyebrow">Profit distribution</p>
                          <h3>How you receive your return</h3>
                        </div>
                        <ol>
                          <li>
                            <span>1</span>
                            <p>
                              Tracking starts after owner approval and uses verified sales from{' '}
                              <strong>
                                {viewingPackage.productNames?.join(', ') || 'the linked products'}
                              </strong>
                              .
                            </p>
                          </li>
                          <li>
                            <span>2</span>
                            <p>
                              Direct product costs are deducted from sales to calculate actual
                              profit. The Owner receives 50%, and 50% enters the Investor pool.
                            </p>
                          </li>
                          <li>
                            <span>3</span>
                            <p>
                              The Investor pool is divided by project units. Your units receive
                              their proportional share, limited by the post’s maximum offered
                              return.
                            </p>
                          </li>
                          <li>
                            <span>4</span>
                            <p>
                              Principal and final verified profit become withdrawable together after{' '}
                              {viewingPackage.durationMonths} months.
                            </p>
                          </li>
                        </ol>
                        <div className="investment-return-example">
                          <span>Example for 1 unit</span>
                          <strong>
                            {money(viewingPackage.amount)} +{' '}
                            {money(
                              (Number(viewingPackage.amount) *
                                Number(viewingPackage.earningMinPercentage)) /
                                100,
                            )}
                            –
                            {money(
                              (Number(viewingPackage.amount) *
                                Number(viewingPackage.earningMaxPercentage)) /
                                100,
                            )}{' '}
                            estimated profit
                          </strong>
                          <small>
                            Estimated maturity total:{' '}
                            {money(
                              Number(viewingPackage.amount) +
                                (Number(viewingPackage.amount) *
                                  Number(viewingPackage.earningMinPercentage)) /
                                  100,
                            )}
                            –
                            {money(
                              Number(viewingPackage.amount) +
                                (Number(viewingPackage.amount) *
                                  Number(viewingPackage.earningMaxPercentage)) /
                                  100,
                            )}
                            . Actual profit depends on verified performance.
                          </small>
                        </div>
                      </section>
                      <div className="investment-opportunity-action">
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max={Math.min(
                              viewingPackage.remainingUnits,
                              viewingPackage.maxUnitsPerInvestor,
                            )}
                            value={quantity}
                            onChange={(event) => setQuantity(Number(event.target.value))}
                          />
                        </label>
                        <div>
                          <small>Total investment</small>
                          <strong>{money(Number(viewingPackage.amount) * quantity)}</strong>
                        </div>
                        <button
                          type="button"
                          disabled={
                            !quantity ||
                            quantity < 1 ||
                            quantity >
                              Math.min(
                                viewingPackage.remainingUnits,
                                viewingPackage.maxUnitsPerInvestor,
                              )
                          }
                          onClick={continueFromOpportunity}
                        >
                          Continue to payment
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {bookingPackage && (
                <div
                  className="investment-booking-backdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setBookingPackage(null)
                  }}
                >
                  <section
                    className="investment-booking-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="investment-booking-title"
                  >
                    <div className="investment-booking-heading">
                      <div>
                        <p className="eyebrow">Book investment units</p>
                        <h2 id="investment-booking-title">{bookingPackage.projectName}</h2>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setBookingPackage(null)}
                      >
                        Close
                      </button>
                    </div>
                    <div className="investment-booking-price">
                      <span>Price per unit</span>
                      <strong>{money(bookingPackage.amount)}</strong>
                    </div>
                    <form onSubmit={confirmBooking}>
                      <label>
                        How many units do you want to book?
                        <input
                          type="number"
                          min="1"
                          max={Math.min(
                            bookingPackage.remainingUnits,
                            bookingPackage.maxUnitsPerInvestor,
                          )}
                          value={quantity}
                          onChange={(event) => setQuantity(Number(event.target.value))}
                          required
                        />
                        <small>
                          Maximum {bookingPackage.maxUnitsPerInvestor} units per investor;{' '}
                          {bookingPackage.remainingUnits} currently available.
                        </small>
                      </label>
                      <div className="investment-booking-total">
                        <span>Total payable</span>
                        <strong>{money(Number(bookingPackage.amount) * quantity)}</strong>
                      </div>
                      <div className="investment-booking-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setBookingPackage(null)}
                        >
                          Cancel
                        </button>
                        <button type="submit">Confirm and continue to payment</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}

              {view === 'history' && (
                <section className="panel investor-record-panel">
                  <div className="panel-title-row">
                    <div>
                      <p className="eyebrow">Permanent record</p>
                      <h2>Investment history</h2>
                    </div>
                    <span className="investor-readonly-pill">Read only</span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date and time invested</th>
                          <th>Amount</th>
                          <th>Approved by</th>
                          <th>Status</th>
                          <th>Removed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(investments?.history || []).map((investment) => (
                          <tr key={investment.id}>
                            <td>{dateTime(investment.investedAt)}</td>
                            <td>{money(investment.amount)}</td>
                            <td>{investment.approvedBy}</td>
                            <td>
                              <span
                                className={`role-label status-${investment.status.toLowerCase()}`}
                              >
                                {investment.status}
                              </span>
                            </td>
                            <td>
                              {investment.removedAt
                                ? `${dateTime(investment.removedAt)} by ${investment.removedBy}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                        {(investments?.history || []).length === 0 && (
                          <tr>
                            <td colSpan="5">No approved investments yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

          {!isInvestor && view === 'overview' && (
            <section className="panel owner-package-manager">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Owner controls</p>
                  <h2>Post an investment opportunity</h2>
                  <p>Create one clear post. Active posts become visible in the investor feed.</p>
                </div>
              </div>
              <form className="investment-post-composer" onSubmit={publishPackage}>
                <label className="investment-post-wide">
                  Project name
                  <input
                    name="projectName"
                    maxLength="140"
                    placeholder="Example: New pizza oven"
                    required
                  />
                </label>
                <label className="investment-post-wide">
                  What will this investment fund?
                  <textarea
                    name="purpose"
                    maxLength="500"
                    rows="3"
                    placeholder="Explain how the money will be used."
                    required
                  />
                </label>
                <div className="investment-image-uploader investment-post-wide">
                  <div className="investment-image-gallery-preview">
                    {newPackageImages.map((image, index) => (
                      <figure key={`${image.slice(-24)}-${index}`}>
                        <img src={image} alt={`New investment image ${index + 1}`} />
                        {index === 0 && <span>Cover</span>}
                        <button
                          type="button"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() =>
                            setNewPackageImages((images) =>
                              images.filter((_, imageIndex) => imageIndex !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </figure>
                    ))}
                    {!newPackageImages.length && <span>No project images selected</span>}
                  </div>
                  <div>
                    <strong>Add project images</strong>
                    <small>Up to 6 images. The first image becomes the cover.</small>
                    <label className="button-like">
                      Choose images
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => selectInvestmentImages(event, 'new')}
                      />
                    </label>
                    {newPackageImages.length > 0 && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setNewPackageImages([])}
                      >
                        Remove all
                      </button>
                    )}
                  </div>
                </div>
                <label>
                  Investment per unit (৳)
                  <input
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="Enter any amount"
                    required
                  />
                </label>
                <label>
                  Funding target (৳)
                  <input
                    name="fundingTarget"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="Enter any amount"
                    required
                  />
                </label>
                <label>
                  Minimum earnings (%)
                  <input name="minimum" type="number" min="0" max="100" step="0.01" required />
                </label>
                <label>
                  Maximum earnings (%)
                  <input name="maximum" type="number" min="0" max="100" step="0.01" required />
                </label>
                <label>
                  Duration (months)
                  <input name="duration" type="number" min="1" max="60" required />
                </label>
                <label>
                  Total investment units
                  <input name="units" type="number" min="1" required />
                </label>
                <label>
                  Maximum units per investor
                  <input name="maxUnitsPerInvestor" type="number" min="1" required />
                  <small>One investor cannot request more than this total.</small>
                </label>
                <div className="product-selector-field">
                  <span>Products connected to this project</span>
                  <details className="product-multiselect">
                    <summary>
                      <span>
                        Select products
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="m4 6 4 4 4-4" />
                        </svg>
                      </span>
                    </summary>
                    <div>
                      {products.map((product) => (
                        <label key={product.id}>
                          <input name="productIds" type="checkbox" value={product.id} />
                          {product.name}
                        </label>
                      ))}
                      {!products.length && <small>Add products in Point of sale first.</small>}
                    </div>
                  </details>
                </div>
                <label className="investment-post-visibility investment-post-wide">
                  <input name="active" type="checkbox" defaultChecked />
                  <span>
                    <strong>Publish as active</strong>
                    <small>Investors can see and select this opportunity immediately.</small>
                  </span>
                </label>
                <button className="investment-post-wide" type="submit" disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Post investment opportunity'}
                </button>
              </form>

              <div className="owner-investment-posts">
                <div className="owner-section-heading">
                  <div>
                    <p className="eyebrow">Published posts</p>
                    <h3>Your investment opportunities</h3>
                  </div>
                  <span>{packages.length} posts</span>
                </div>
                {packages.map((investmentPackage) => (
                  <article
                    key={investmentPackage.id}
                    className="owner-investment-post"
                    role="button"
                    tabIndex="0"
                    aria-label={`Edit ${investmentPackage.projectName}`}
                    onClick={() => openPackageEditor(investmentPackage)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openPackageEditor(investmentPackage)
                      }
                    }}
                  >
                    <div className="owner-investment-post-image">
                      {investmentPackage.imageDataUrl ? (
                        <img
                          src={investmentPackage.imageDataUrl}
                          alt={`${investmentPackage.projectName} project`}
                        />
                      ) : (
                        <span>{investmentPackage.projectName.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="owner-investment-post-copy">
                      <span
                        className={`investment-visibility-badge ${investmentPackage.active ? 'active' : 'inactive'}`}
                      >
                        {investmentPackage.active ? 'Active' : 'Inactive'}
                      </span>
                      <h3>{investmentPackage.projectName}</h3>
                      <p>{investmentPackage.purpose}</p>
                      <small>Click to view and edit full details</small>
                    </div>
                    <dl>
                      <div>
                        <dt>Per unit</dt>
                        <dd>{money(investmentPackage.amount)}</dd>
                      </div>
                      <div>
                        <dt>Expected earnings</dt>
                        <dd>
                          {percent(investmentPackage.earningMinPercentage)}–
                          {percent(investmentPackage.earningMaxPercentage)}
                        </dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{investmentPackage.durationMonths} months</dd>
                      </div>
                      <div>
                        <dt>Available</dt>
                        <dd>{investmentPackage.remainingUnits} units</dd>
                      </div>
                      <div>
                        <dt>Per-investor limit</dt>
                        <dd>{investmentPackage.maxUnitsPerInvestor} units</dd>
                      </div>
                    </dl>
                    <div
                      className="owner-investment-post-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="investment-visibility-switch">
                        <span>
                          {changingVisibilityId === investmentPackage.id
                            ? 'Updating…'
                            : investmentPackage.active
                              ? 'Active'
                              : 'Inactive'}
                        </span>
                        <input
                          type="checkbox"
                          checked={investmentPackage.active}
                          disabled={changingVisibilityId === investmentPackage.id}
                          onChange={() => changePackageVisibility(investmentPackage)}
                          aria-label={`${investmentPackage.active ? 'Deactivate' : 'Activate'} ${investmentPackage.projectName}`}
                        />
                        <i aria-hidden="true" />
                      </label>
                      <button
                        type="button"
                        className="danger investment-post-delete"
                        disabled={deletingPackageId === investmentPackage.id}
                        onClick={() => deletePackage(investmentPackage)}
                      >
                        {deletingPackageId === investmentPackage.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
                {!packages.length && (
                  <p className="empty-state">Your published opportunities will appear here.</p>
                )}
              </div>
              {editingPackage && (
                <div
                  className="investment-edit-modal-backdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setEditingPackage(null)
                  }}
                >
                  <section
                    className="investment-edit-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="investment-edit-title"
                  >
                    <div className="panel-title-row">
                      <div>
                        <p className="eyebrow">Edit investment post</p>
                        <h2 id="investment-edit-title">Correct opportunity details</h2>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditingPackage(null)}
                      >
                        Close
                      </button>
                    </div>
                    <form
                      className="investment-post-composer"
                      onSubmit={(event) => {
                        event.preventDefault()
                        updatePackage(editingPackage, event.currentTarget)
                      }}
                    >
                      <label className="investment-post-wide">
                        Project name
                        <input
                          name="projectName"
                          maxLength="140"
                          defaultValue={editingPackage.projectName}
                          required
                        />
                      </label>
                      <label className="investment-post-wide">
                        Funding purpose
                        <textarea
                          name="purpose"
                          maxLength="500"
                          rows="3"
                          defaultValue={editingPackage.purpose}
                          required
                        />
                      </label>
                      <div className="investment-image-uploader investment-post-wide">
                        <div className="investment-image-gallery-preview">
                          {editingPackageImages.map((image, index) => (
                            <figure key={`${image.slice(-24)}-${index}`}>
                              <img src={image} alt={`Investment image ${index + 1}`} />
                              {index === 0 && <span>Cover</span>}
                              <button
                                type="button"
                                aria-label={`Remove image ${index + 1}`}
                                onClick={() =>
                                  setEditingPackageImages((images) =>
                                    images.filter((_, imageIndex) => imageIndex !== index),
                                  )
                                }
                              >
                                ×
                              </button>
                            </figure>
                          ))}
                          {!editingPackageImages.length && <span>No project images selected</span>}
                        </div>
                        <div>
                          <strong>Project images</strong>
                          <small>Up to 6 images. The first image becomes the cover.</small>
                          <label className="button-like">
                            Add images
                            <input
                              type="file"
                              multiple
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) => selectInvestmentImages(event, 'edit')}
                            />
                          </label>
                          {editingPackageImages.length > 0 && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setEditingPackageImages([])}
                            >
                              Remove all
                            </button>
                          )}
                        </div>
                      </div>
                      <label>
                        Investment per unit (৳)
                        <input
                          name="amount"
                          type="number"
                          inputMode="decimal"
                          step="any"
                          defaultValue={Number(editingPackage.amount)}
                          required
                        />
                      </label>
                      <label>
                        Funding target (৳)
                        <input
                          name="fundingTarget"
                          type="number"
                          inputMode="decimal"
                          step="any"
                          defaultValue={Number(editingPackage.fundingTarget)}
                          required
                        />
                      </label>
                      <label>
                        Minimum earnings (%)
                        <input
                          name="minimum"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={Number(editingPackage.earningMinPercentage)}
                          required
                        />
                      </label>
                      <label>
                        Maximum earnings (%)
                        <input
                          name="maximum"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={Number(editingPackage.earningMaxPercentage)}
                          required
                        />
                      </label>
                      <label>
                        Duration (months)
                        <input
                          name="duration"
                          type="number"
                          min="1"
                          max="60"
                          defaultValue={editingPackage.durationMonths}
                          required
                        />
                      </label>
                      <label>
                        Total units
                        <input
                          name="units"
                          type="number"
                          min={editingPackage.totalUnits - editingPackage.remainingUnits || 1}
                          defaultValue={editingPackage.totalUnits}
                          required
                        />
                      </label>
                      <label>
                        Maximum units per investor
                        <input
                          name="maxUnitsPerInvestor"
                          type="number"
                          min="1"
                          max={editingPackage.totalUnits}
                          defaultValue={editingPackage.maxUnitsPerInvestor}
                          required
                        />
                        <small>Existing investor commitments cannot exceed the new limit.</small>
                      </label>
                      <div className="product-selector-field">
                        <span>Products connected to this project</span>
                        <details className="product-multiselect">
                          <summary>
                            <span>
                              Select products
                              <svg viewBox="0 0 16 16" aria-hidden="true">
                                <path d="m4 6 4 4 4-4" />
                              </svg>
                            </span>
                          </summary>
                          <div>
                            {products.map((product) => (
                              <label key={product.id}>
                                <input
                                  name="productIds"
                                  type="checkbox"
                                  value={product.id}
                                  defaultChecked={editingPackage.productIds?.includes(product.id)}
                                />
                                {product.name}
                              </label>
                            ))}
                            {!products.length && (
                              <small>Add products in Point of sale first.</small>
                            )}
                          </div>
                        </details>
                      </div>
                      <div className="investment-edit-actions investment-post-wide">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setEditingPackage(null)}
                        >
                          Cancel
                        </button>
                        <button type="submit">Save changes</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          )}
        </>
      )}
      {cropSource && (
        <div className="investment-cropper-backdrop" role="presentation">
          <section
            className="investment-cropper"
            role="dialog"
            aria-modal="true"
            aria-labelledby="investment-cropper-title"
          >
            <div className="investment-cropper-heading">
              <div>
                <p className="eyebrow">Adjust project image</p>
                <h2 id="investment-cropper-title">Crop your cover</h2>
                <small>{cropQueue.length + 1} selected image(s) remaining</small>
              </div>
              <button type="button" className="secondary" onClick={closeImageCropper}>
                Cancel
              </button>
            </div>
            <div className="investment-crop-frame">
              <img
                src={cropSource}
                alt="Crop preview"
                style={{
                  objectPosition: `${cropX}% ${cropY}%`,
                  transform: `scale(${cropZoom})`,
                  transformOrigin: `${cropX}% ${cropY}%`,
                }}
              />
              <span>Investment cover preview</span>
            </div>
            <div className="investment-crop-controls">
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </label>
              <label>
                Horizontal position
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropX}
                  onChange={(event) => setCropX(Number(event.target.value))}
                />
              </label>
              <label>
                Vertical position
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropY}
                  onChange={(event) => setCropY(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="investment-crop-actions">
              <button type="button" className="secondary" onClick={advanceImageCropper}>
                Skip this image
              </button>
              <button type="button" onClick={applyImageCrop}>
                Apply crop
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
