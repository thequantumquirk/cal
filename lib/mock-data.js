// Mock data utilities for dashboard

// Generate mock stock performance data for multiple tickers
export function generateMockStockData() {
  const tickers = ['VFS', 'TSLA', 'RIVN', 'SPX', 'Nasdaq']
  const days = 30
  const data = []

  const baseValues = {
    VFS: 100,
    TSLA: 250,
    RIVN: 15,
    SPX: 4500,
    Nasdaq: 14000
  }

  const volatility = {
    VFS: 0.03,
    TSLA: 0.04,
    RIVN: 0.05,
    SPX: 0.015,
    Nasdaq: 0.02
  }

  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i))

    const dataPoint = {
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      fullDate: date.toISOString().split('T')[0]
    }

    tickers.forEach(ticker => {
      const baseValue = baseValues[ticker]
      const change = (Math.random() - 0.5) * 2 * volatility[ticker] * baseValue
      const previousValue = i === 0 ? baseValue : data[i - 1][ticker]
      dataPoint[ticker] = Math.max(0, previousValue + change)

      // Calculate percentage change from start
      dataPoint[`${ticker}Change`] = ((dataPoint[ticker] - baseValue) / baseValue) * 100
    })

    data.push(dataPoint)
  }

  return data
}

// Mock news data
export function getMockNews() {
  return [
    {
      headline: "Tesla says Model Y L is 'coming soon'",
      link: "https://www.reuters.com/business/autos-transportation/tesla-says-model-y-l-is-coming-soon-2025-08-15/",
      date: "2025-10-29"
    },
    {
      headline: "Rivian, Tesla, and Lucid say they face big losses as the Trump administration threatens EV tax credits",
      link: "https://www.businessinsider.com/rivian-tesla-lucid-face-big-losses-after-trump-threatens-ev-tax-2025-08-14/",
      date: "2025-10-28"
    },
    {
      headline: "Inside BYD's plan to rule the waves",
      link: "https://www.businessinsider.com/see-byds-fleet-car-carrying-ships-global-dominance-2025-08-13/",
      date: "2025-10-27"
    },
    {
      headline: "BYD launches China's first NEV-dedicated all-terrain track vehicle",
      link: "https://finance.yahoo.com/news/byd-launches-china-first-nev-103725012.html",
      date: "2025-10-26"
    },
    {
      headline: "World's Largest Hedge Fund Sells Alibaba, Baidu, Nio, and other Chinese stocks",
      link: "https://www.barrons.com/articles/bridgewater-alibaba-baidu-nio-chinese-stocks-sell-2025-08-12/",
      date: "2025-10-25"
    },
    {
      headline: "Nio CEO Says Company Entered 'Harvest Period', Reaffirms 2025 Delivery Target",
      link: "https://electric-vehicles.com/nio/nio-ceo-says-company-entered-harvest-period-reaffirms-2025-delivery-target/",
      date: "2025-10-24"
    },
    {
      headline: "Tesla almost halves UK monthly lease fee as sales slump, Tesla price cuts continue",
      link: "https://www.reuters.com/business/autos-transportation/tesla-almost-halves-uk-monthly-lease-fee-as-sales-slump-2025-08-11/",
      date: "2025-10-23"
    },
    {
      headline: "Despite setbacks, EV maker Rivian presses ahead with Georgia plant and new models",
      link: "https://www.detroitnews.com/story/business/autos/2025/08/10/despite-setbacks-ev-maker-rivian-presses-ahead-georgia-plant/",
      date: "2025-10-22"
    },
    {
      headline: "Tesla Stock Surges After Musk's Robo-Taxi Rollout",
      link: "https://www.barrons.com/articles/tesla-stock-price-musk-robo-taxi-rollout-2025-08-09/",
      date: "2025-10-21"
    }
  ]
}

// Mock calendar events
export function getMockCalendarEvents() {
  const events = []
  const today = new Date(2025, 9, 30) // October 30, 2025

  // Economic events
  events.push({
    date: new Date(2025, 9, 14),
    type: 'economic',
    title: 'CPI',
    description: 'Consumer Price Index Release',
    category: 'Economic Indicator'
  })

  events.push({
    date: new Date(2025, 9, 15),
    type: 'economic',
    title: 'PPI',
    description: 'Producer Price Index Release',
    category: 'Economic Indicator'
  })

  events.push({
    date: new Date(2025, 9, 28),
    type: 'economic',
    title: 'Fed Meeting',
    description: 'Federal Reserve FOMC Meeting',
    category: 'Economic Indicator'
  })

  // Issuer-specific events
  events.push({
    date: new Date(2025, 9, 5),
    type: 'corporate',
    title: 'Board Meeting',
    description: 'Quarterly Board of Directors Meeting',
    category: 'Corporate'
  })

  events.push({
    date: new Date(2025, 9, 20),
    type: 'corporate',
    title: 'Earnings Call',
    description: 'Q3 2025 Earnings Conference Call',
    category: 'Corporate'
  })

  events.push({
    date: new Date(2025, 9, 25),
    type: 'corporate',
    title: '10-Q Filing',
    description: 'SEC 10-Q Quarterly Report Due',
    category: 'Corporate'
  })

  events.push({
    date: new Date(2025, 10, 1),
    type: 'corporate',
    title: 'Annual Meeting',
    description: 'Annual Shareholder Meeting',
    category: 'Corporate'
  })

  return events
}

// Mock investor breakdown data
export function getMockInvestorBreakdown() {
  return {
    institutional: 0.1,
    retail: 2.0,
    insider: 97.9
  }
}

// Mock insiders data
export function getMockInsiders() {
  return [
    {
      id: 1,
      shareholder: "Vingroup",
      shareholderType: "Entity",
      location: "Vietnam",
      typeOfSecurity: "Ordinary Shares",
      classOfSecurity: "Common Stock",
      numSecurities: "1,185,010,424",
      ownership: "50.67%",
      is1yrHolder: "Yes",
      restrictions: "Y"
    },
    {
      id: 2,
      shareholder: "VIG",
      shareholderType: "Entity",
      location: "Vietnam",
      typeOfSecurity: "Ordinary Shares",
      classOfSecurity: "Common Stock",
      numSecurities: "769,584,044",
      ownership: "32.907%",
      is1yrHolder: "Yes",
      restrictions: "Y"
    },
    {
      id: 3,
      shareholder: "Asian Star",
      shareholderType: "Entity",
      location: "Singapore",
      typeOfSecurity: "Ordinary Shares",
      classOfSecurity: "Common Stock",
      numSecurities: "334,041,555",
      ownership: "14.283%",
      is1yrHolder: "Yes",
      restrictions: "Y"
    },
    {
      id: 4,
      shareholder: "Thuy Le",
      shareholderType: "Individual",
      location: "Vietnam",
      typeOfSecurity: "Ordinary Shares",
      classOfSecurity: "Common Stock",
      numSecurities: "400,000",
      ownership: "0.017%",
      is1yrHolder: "Yes",
      restrictions: "Y"
    }
  ]
}

// Mock institutional investors data
export function getMockInstitutionalInvestors() {
  return [
    {
      id: 1,
      investor: "Tidal Investments LLC",
      investorType: "GARP",
      aum: "$9,156",
      companyHoldings: "$0.690",
      ownershipPeriod: "Buyer"
    },
    {
      id: 2,
      investor: "Eurizon Capital S.A.",
      investorType: "Core Value",
      aum: "$16,089",
      companyHoldings: "$0.394",
      ownershipPeriod: "Seller"
    },
    {
      id: 3,
      investor: "Carbon Collective Investment LLC",
      investorType: "Hedge Fund",
      aum: "$33",
      companyHoldings: "$0.370",
      ownershipPeriod: "Seller"
    },
    {
      id: 4,
      investor: "Evolve Funds Group Inc",
      investorType: "Hedge Fund",
      aum: "$1,419",
      companyHoldings: "$0.367",
      ownershipPeriod: "Seller"
    },
    {
      id: 5,
      investor: "Millennium Management LLC",
      investorType: "Hedge Fund",
      aum: "$118,381",
      companyHoldings: "$0.253",
      ownershipPeriod: "Buyer"
    },
    {
      id: 6,
      investor: "GSA Capital Partners LLP",
      investorType: "Hedge Fund",
      aum: "$1,430",
      companyHoldings: "$0.046",
      ownershipPeriod: "Buyer"
    },
    {
      id: 7,
      investor: "Desjardins Securities Inc.",
      investorType: "Hedge Fund",
      aum: "$14,874",
      companyHoldings: "$0.035",
      ownershipPeriod: "Seller"
    },
    {
      id: 8,
      investor: "Morgan Stanley Smith Barney LLC",
      investorType: "Core Growth",
      aum: "$554,361",
      companyHoldings: "$0.023",
      ownershipPeriod: "Seller"
    },
    {
      id: 9,
      investor: "CSOP Asset Management Limited",
      investorType: "Hedge Fund",
      aum: "$4,709",
      companyHoldings: "$0.018",
      ownershipPeriod: "Seller"
    },
    {
      id: 10,
      investor: "Eurizon Capital SGR S.p.A.",
      investorType: "Core Growth",
      aum: "$47,277",
      companyHoldings: "$0.017",
      ownershipPeriod: "Seller"
    }
  ]
}

// Mock investor targets data
export function getMockInvestorTargets() {
  return [
    {
      id: 1,
      investor: "Capital World Investors",
      investorType: "Growth",
      aum: "$831,820",
      vfsPosition: "0",
      peersHoldings: "$14,502",
      numPeersHeld: "1",
      location: "Los Angeles",
      metPreviously: "Y",
      followUp: "Share Management Presentation"
    },
    {
      id: 2,
      investor: "Orage Bank Asset Management (NBIM)",
      investorType: "Core Value",
      aum: "$1,216,365",
      vfsPosition: "0",
      peersHoldings: "$10,512",
      numPeersHeld: "3",
      location: "Oslo",
      metPreviously: "Y",
      followUp: "N A"
    },
    {
      id: 3,
      investor: "T. Rowe Price Associates, Inc.",
      investorType: "GARP",
      aum: "$1,093,277",
      vfsPosition: "0",
      peersHoldings: "$8,852",
      numPeersHeld: "2",
      location: "Baltimore",
      metPreviously: "Y",
      followUp: "N A"
    },
    {
      id: 4,
      investor: "Fidelity Management & Research Company LLC",
      investorType: "GARP",
      aum: "$2,249,665",
      vfsPosition: "0",
      peersHoldings: "$8,070",
      numPeersHeld: "3",
      location: "Boston",
      metPreviously: "Y",
      followUp: "N A"
    },
    {
      id: 5,
      investor: "JP Morgan Asset Management",
      investorType: "GARP",
      aum: "$759,673",
      vfsPosition: "0",
      peersHoldings: "$6,791",
      numPeersHeld: "3",
      location: "New York",
      metPreviously: "Y",
      followUp: "N A"
    }
  ]
}

// Mock securities data
export function getMockSecurities() {
  return [
    {
      id: 1,
      shareholder: "Vingroup JSC",
      typeOfSecurity: "Common Stock",
      numSecurities: 1185010424
    },
    {
      id: 2,
      shareholder: "VIG Partners",
      typeOfSecurity: "Common Stock",
      numSecurities: 769584044
    },
    {
      id: 3,
      shareholder: "Asian Star Company Limited",
      typeOfSecurity: "Common Stock",
      numSecurities: 334041555
    },
    {
      id: 4,
      shareholder: "John Smith",
      typeOfSecurity: "Common Stock",
      numSecurities: 5000000
    },
    {
      id: 5,
      shareholder: "Sarah Johnson",
      typeOfSecurity: "Common Stock",
      numSecurities: 2500000
    },
    {
      id: 6,
      shareholder: "Michael Chen",
      typeOfSecurity: "Preferred Stock - Series A",
      numSecurities: 1000000
    },
    {
      id: 7,
      shareholder: "Emily Rodriguez",
      typeOfSecurity: "Common Stock",
      numSecurities: 750000
    },
    {
      id: 8,
      shareholder: "David Park",
      typeOfSecurity: "Common Stock",
      numSecurities: 500000
    },
    {
      id: 9,
      shareholder: "Thuy Le",
      typeOfSecurity: "Common Stock",
      numSecurities: 400000
    },
    {
      id: 10,
      shareholder: "Investment Group Alpha",
      typeOfSecurity: "Preferred Stock - Series B",
      numSecurities: 300000
    },
    {
      id: 11,
      shareholder: "Beta Capital LLC",
      typeOfSecurity: "Common Stock",
      numSecurities: 250000
    },
    {
      id: 12,
      shareholder: "Gamma Ventures",
      typeOfSecurity: "Warrants",
      numSecurities: 200000
    }
  ]
}
