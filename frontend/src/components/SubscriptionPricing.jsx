const plans = [
  {
    name: 'Essential',
    price: 10,
    description: 'The everyday tools a small team needs to run the business.',
    features: [
      'Dashboard and business overview',
      'Point of sale and order history',
      'Expense tracking',
      'Team structure and support',
    ],
  },
  {
    name: 'Complete',
    price: 15,
    description: 'Every feature, including advanced finance and investment tools.',
    featured: true,
    features: [
      'Everything in Essential',
      'Accounting and break-even tools',
      'Analytics and reports',
      'Investor and profit management',
    ],
  },
]

const BB_ADMIN_WHATSAPP = '8801576686100'

function whatsappUrl(plan) {
  const message = [
    'Hello BB Admin,',
    '',
    `I want to activate the ${plan.name} plan ($${plan.price} for 30 days) for my Breaking Business workspace.`,
    'Please send me the payment instructions and activate access after verifying my payment.',
  ].join('\n')

  return `https://wa.me/${BB_ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function SubscriptionPricing() {
  return (
    <section className="subscription-pricing" aria-labelledby="subscription-pricing-title">
      <div className="subscription-pricing-intro">
        <div>
          <p className="eyebrow">Simple pricing</p>
          <h2 id="subscription-pricing-title">Start free, then choose what fits</h2>
          <p>
            Every new business receives full access for 7 days. No payment is taken during the
            trial.
          </p>
        </div>
        <div className="subscription-trial-badge" aria-label="Seven-day free trial">
          <strong>7</strong>
          <span>days free</span>
          <small>All features included</small>
        </div>
      </div>

      <div className="subscription-plan-grid">
        {plans.map((plan) => (
          <article
            className={`subscription-plan-card${plan.featured ? ' featured' : ''}`}
            key={plan.name}
          >
            {plan.featured && <span className="subscription-popular">Full access</span>}
            <div className="subscription-plan-heading">
              <div>
                <small>{plan.name}</small>
                <h3>
                  <span>$</span>
                  {plan.price}
                  <em>/ month</em>
                </h3>
              </div>
              <span className="subscription-duration">30 days</span>
            </div>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span aria-hidden="true">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="subscription-renewal-note">
              <span aria-hidden="true">↻</span>
              <div>
                <strong>One-month access</strong>
                <small>Renew manually after 30 days. No automatic charge.</small>
              </div>
            </div>
            <a
              className="subscription-whatsapp-action"
              href={whatsappUrl(plan)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Contact BB Admin on WhatsApp for the ${plan.name} plan`}
            >
              <span aria-hidden="true">◉</span> Continue on WhatsApp
            </a>
          </article>
        ))}
      </div>
      <p className="subscription-payment-disclosure">
        Contact BB Admin, complete payment using the provided instructions, and access will be
        activated after payment verification.
      </p>
    </section>
  )
}
