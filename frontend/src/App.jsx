import React, { useState, useEffect, useMemo } from 'react'

const API = '/api'

const QUICK_SITES = [
  { label: 'Google', note: 'Safe', url: 'https://google.com', tone: 'safe' },
  { label: 'PayPal Update', note: 'Phishing', url: 'https://paypal-account-security-update.com/login', tone: 'danger' },
  { label: 'Bank Verify', note: 'Suspicious', url: 'http://bank-verification.xyz/auth', tone: 'warning' },
]

function Icon({ name, size = 16, className = '' }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `svg-icon ${className}`,
    'aria-hidden': true,
  }

  switch (name) {
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'shield-alert':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    case 'shield-x':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      )
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'alert-triangle':
      return (
        <svg {...props}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...props}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )
    case 'download':
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
      )
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'close':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...props}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'cpu':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      )
    case 'layers':
      return (
        <svg {...props}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )
    case 'file-text':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg {...props}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )
    case 'terminal':
      return (
        <svg {...props}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      )
    default:
      return null
  }
}

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ total: 0, blocked: 0, review: 0, allowed: 0, avg_risk: 0 })
  const [loading, setLoading] = useState(false)
  const [deepScanning, setDeepScanning] = useState(false)
  const [deepScanResult, setDeepScanResult] = useState(null)
  const [protectionEnabled, setProtectionEnabled] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showFeatures, setShowFeatures] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('phishguard-theme') === 'dark'
  })
  const [scanDots, setScanDots] = useState(0)

  useEffect(() => {
    if (!loading && !deepScanning) {
      setScanDots(0)
      return
    }
    const timer = setInterval(() => {
      setScanDots((prev) => (prev + 1) % 7)
    }, 500)
    return () => clearInterval(timer)
  }, [loading, deepScanning])

  const scanningDotsText = `Scanning${'.'.repeat(scanDots)}`

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const handleThemeToggle = (e) => {
    const nextDark = !darkMode
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const maxDist = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )
    const targetScale = (maxDist * 2.3) / 50

    const circle = document.createElement('div')
    circle.className = 'theme-wave-circle'
    circle.style.left = `${x - 25}px`
    circle.style.top = `${y - 25}px`
    circle.style.backgroundColor = nextDark ? '#222831' : '#edf2f7'
    circle.style.setProperty('--target-scale', targetScale)
    document.body.appendChild(circle)

    requestAnimationFrame(() => {
      circle.classList.add('expanding')
    })

    setTimeout(() => {
      setDarkMode(nextDark)
      document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light')
      localStorage.setItem('phishguard-theme', nextDark ? 'dark' : 'light')
    }, 320)

    setTimeout(() => {
      circle.remove()
    }, 700)
  }

  const fetchData = async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API}/history`),
        fetch(`${API}/stats`),
      ])

      if (historyRes.ok) setHistory(await historyRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      setError('')
    } catch {
      setError('Backend server is currently unreachable. Make sure python app.py is running on port 5000.')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleScan = async (targetUrl = url) => {
    const cleanUrl = targetUrl.trim()
    if (!cleanUrl) {
      setError('Please paste or type a web address to inspect.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Analysis could not be completed.')
      }

      setResult(data)
      setUrl(cleanUrl)
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeepScan = async (targetUrl = url) => {
    const cleanUrl = targetUrl.trim()
    if (!cleanUrl) {
      setError('Please paste or type a web address for deep sandbox analysis.')
      return
    }

    setDeepScanning(true)
    setError('')
    setDeepScanResult(null)

    const startTime = Date.now()
    const TIMEOUT_MS = 90000
    const POLL_INTERVAL_MS = 2000

    try {
      let startRes
      try {
        startRes = await fetch(`${API}/deep-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        })
      } catch {
        startRes = await fetch('/deep-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        })
      }

      const startData = await startRes.json().catch(() => ({}))
      if (!startRes.ok) {
        throw new Error(startData.error || 'Could not start sandbox deep scan.')
      }

      const jobId = startData.job_id
      if (!jobId) {
        throw new Error('No job identifier was returned by the sandbox backend.')
      }

      while (true) {
        if (Date.now() - startTime >= TIMEOUT_MS) {
          throw new Error('Sandbox deep scan timed out after 90 seconds. Execution took longer than expected.')
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

        let pollRes
        try {
          pollRes = await fetch(`${API}/deep-scan/${jobId}`)
        } catch {
          pollRes = await fetch(`/deep-scan/${jobId}`)
        }

        if (!pollRes.ok) {
          const errData = await pollRes.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to retrieve deep scan status.')
        }

        const pollData = await pollRes.json()

        if (pollData.status === 'done') {
          setDeepScanResult(pollData.result)
          setUrl(cleanUrl)
          break
        } else if (pollData.status === 'failed') {
          throw new Error(pollData.error || 'Sandbox deep scan failed to analyze the target URL.')
        }
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Backend server is unreachable. Please ensure the Flask backend is running on port 5000.')
      } else {
        setError(err.message || 'An unexpected error occurred during deep sandbox analysis.')
      }
    } finally {
      setDeepScanning(false)
    }
  }

  const handleDownloadPdf = async (analysisId) => {
    if (!analysisId) return
    try {
      const res = await fetch(`${API}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId }),
      })

      if (!res.ok) throw new Error('Could not generate the security report.')

      const blob = await res.blob()
      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(blob)
      downloadLink.download = `security-report-${analysisId}.pdf`
      downloadLink.click()
      URL.revokeObjectURL(downloadLink.href)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleViewDetails = async (id) => {
    try {
      const res = await fetch(`${API}/history/${id}`)
      if (!res.ok) throw new Error('Could not load record details.')
      const data = await res.json()
      setSelectedRecord(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleExportCsv = () => {
    if (!history.length) {
      setError('There are no scan records to export yet.')
      return
    }

    const headers = ['ID', 'URL', 'Verdict', 'Risk Score', 'Confidence', 'Timestamp']
    const csvRows = history.map((item) => [
      item.id,
      `"${item.url.replace(/"/g, '""')}"`,
      item.decision.toUpperCase(),
      `${Number(item.risk_score).toFixed(1)}%`,
      item.confidence != null ? `${item.confidence}%` : 'N/A',
      item.created_at,
    ])

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scan-history-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFilter = filter === 'all' || item.decision === filter
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || item.url.toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [history, filter, search])

  const getVerdictDetails = (decision) => {
    switch (decision) {
      case 'block':
        return {
          title: 'Phishing Threat Detected',
          badgeText: 'Blocked',
          className: 'verdict-blocked',
          iconName: 'shield-x',
          description:
            'This address matches strong deceptive patterns designed to impersonate trusted services or steal user credentials. Visiting it is not recommended.',
        }
      case 'review':
        return {
          title: 'Suspicious — Proceed With Caution',
          badgeText: 'Review',
          className: 'verdict-review',
          iconName: 'alert-triangle',
          description:
            'This URL contains unusual structures, suspicious domain extensions, or unverified redirects. Avoid entering sensitive passwords or payment details.',
        }
      default:
        return {
          title: 'Verified Safe',
          badgeText: 'Safe',
          className: 'verdict-safe',
          iconName: 'check',
          description:
            'No deceptive patterns, lookalike branding, or credential-harvesting indicators were found. The domain matches verified authentic infrastructure.',
        }
    }
  }

  const getDeepScanVerdictDetails = (verdict) => {
    const v = (verdict || '').toLowerCase()
    if (v.includes('phish')) {
      return {
        title: 'Phishing Target Intercepted',
        badgeText: 'Phishing',
        className: 'verdict-blocked',
        iconName: 'shield-x',
        description:
          'Active deception or security interstitial detected inside sandbox environment. The target page initiates credential harvesting forms, deceptive brand spoofing, or has been flagged for phishing.',
      }
    }
    if (v.includes('suspicious')) {
      return {
        title: 'Suspicious Behavior Detected',
        badgeText: 'Suspicious',
        className: 'verdict-review',
        iconName: 'alert-triangle',
        description:
          'Anomalous DOM modifications, obfuscated script executions, inactive threat simulation paths, or multi-hop redirect gateways were identified.',
      }
    }
    if (v.includes('timeout') || v.includes('timed out') || v.includes('inactive') || v.includes('unreachable') || v.includes('failed')) {
      return {
        title: 'Connection Inaccessible / Timed Out',
        badgeText: 'Timeout',
        className: 'verdict-review',
        iconName: 'alert-triangle',
        description:
          'The destination server timed out or failed to complete HTTP communication during sandbox evaluation.',
      }
    }
    if (v.includes('404') || v.includes('not found')) {
      return {
        title: 'Inactive / Endpoint Not Found (HTTP 404)',
        badgeText: 'HTTP 404',
        className: 'verdict-review',
        iconName: 'alert-triangle',
        description:
          'The destination server returned HTTP 404 (Not Found) or 410 (Gone). The page does not exist, was taken down by the host, or is an inactive dead link.',
      }
    }
    if (v.includes('nxdomain') || v.includes('offline')) {
      return {
        title: 'Non-Existent / Inactive Domain (NXDOMAIN)',
        badgeText: 'NXDOMAIN',
        className: 'verdict-review',
        iconName: 'alert-triangle',
        description:
          'This domain failed DNS resolution. Public nameservers confirm it does not exist (NXDOMAIN / ERR_NAME_NOT_RESOLVED). The site is offline, expired, or suspended.',
      }
    }
    if (v.includes('403') || v.includes('500') || v.includes('502') || v.includes('error') || v.includes('blocked')) {
      return {
        title: 'Endpoint Inaccessible / Server Error',
        badgeText: 'HTTP Error',
        className: 'verdict-review',
        iconName: 'alert-triangle',
        description:
          'The destination web server returned an error status code or actively blocked access to the sandbox container.',
      }
    }
    if (v.includes('safe') || v.includes('allow')) {
      return {
        title: 'Safe Destination Verified',
        badgeText: 'Safe',
        className: 'verdict-safe',
        iconName: 'check',
        description:
          'Headless container executed full navigation and DOM rendering without observing credential spoofing or malicious network signals.',
      }
    }
    return {
      title: 'Unverified Destination',
      badgeText: 'Review',
      className: 'verdict-review',
      iconName: 'alert-triangle',
      description: 'Destination evaluation yielded inconclusive telemetry. Exercise caution.',
    }
  }

  const isScanningAny = loading || deepScanning

  return (
    <div className="container">
      <div className="ambient-radar" aria-hidden="true">
        <div className="radar-circle radar-1"></div>
        <div className="radar-circle radar-2"></div>
        <div className="radar-circle radar-3"></div>
      </div>

      <header className="header">
        <div className="brand">
          <div className="brand-logo">
            <img src="/icon.png" alt="PhishGuard Shield" className="brand-logo-img" />
          </div>
          <div>
            <div className="brand-title">
              PhishGuard <span className="brand-badge">Security Monitor</span>
            </div>
            <p className="brand-subtitle">Real-time URL threat detection and phishing prevention</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="engine-status">
            <span className="pulse-dot"></span>
            <span>Engines Online</span>
          </div>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={handleThemeToggle}
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle visual theme"
          >
            <Icon name={darkMode ? 'sun' : 'moon'} size={15} />
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            className={`toggle-btn ${protectionEnabled ? 'active' : ''}`}
            onClick={() => setProtectionEnabled(!protectionEnabled)}
          >
            Interception: <strong>{protectionEnabled ? 'Active' : 'Disabled'}</strong>
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="scanner-card">
          <div className="scanner-intro">
            <h2>Check a link before you click it</h2>
            <p>Paste any web address to test it against verified domain lists, brand lookalikes, pattern-recognition models, or sandbox emulation.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleScan()
            }}
            className="search-box"
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a web address (e.g. login-verify-update.com/signin)..."
              disabled={isScanningAny}
            />

            <button type="submit" className="scan-btn" disabled={isScanningAny}>
              {loading ? scanningDotsText : 'Scan Link'}
            </button>

            <button
              type="button"
              className="scan-btn deep-scan-btn"
              onClick={() => handleDeepScan()}
              disabled={isScanningAny}
            >
              {deepScanning ? scanningDotsText : 'Deep Scan'}
            </button>
          </form>

          <div className="quick-examples">
            <span className="examples-label">Examples:</span>
            <div className="examples-list">
              {QUICK_SITES.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="example-btn"
                  onClick={() => {
                    setUrl(item.url)
                    handleScan(item.url)
                  }}
                  disabled={isScanningAny}
                >
                  <span className={`example-dot dot-${item.tone}`}></span>
                  <span className="example-name">{item.label}</span>
                  <span className="example-tag">({item.note})</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="alert-error">
              <Icon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}
        </section>

        <section className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-name">Total Links Scanned</div>
          </div>
          <div className="stat-card stat-safe">
            <div className="stat-num">{stats.allowed}</div>
            <div className="stat-name">Clean Destinations</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-num">{stats.review}</div>
            <div className="stat-name">Flagged for Review</div>
          </div>
          <div className="stat-card stat-danger">
            <div className="stat-num">{stats.blocked}</div>
            <div className="stat-name">Threats Intercepted</div>
          </div>
        </section>

        {deepScanResult && (
          <section className="deep-scan-card">
            <div className="deep-scan-header">
              <div className="deep-scan-title-wrap">
                <h3>Isolated Environment Execution</h3>
                <span className="deep-scan-sub">Runtime behavioral inspection</span>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setDeepScanResult(null)}
                aria-label="Dismiss deep scan results"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {(() => {
              const verdictInfo = getDeepScanVerdictDetails(deepScanResult.verdict)
              const screenshotSrc = deepScanResult.screenshot?.startsWith('data:')
                ? deepScanResult.screenshot
                : `data:image/png;base64,${deepScanResult.screenshot || ''}`

              return (
                <>
                  <div className={`verdict-banner ${verdictInfo.className}`}>
                    <div className="verdict-icon">
                      <Icon name={verdictInfo.iconName} size={28} />
                    </div>
                    <div className="verdict-text">
                      <div className="verdict-header">
                        <h3>{verdictInfo.title}</h3>
                      </div>
                      <p>{verdictInfo.description}</p>
                      <div className="url-preview">{deepScanResult.scanned_url || url}</div>
                    </div>
                  </div>

                  <div className="scores-grid">
                    <div className="score-box">
                      <span className="score-label">Sandbox Verdict</span>
                      <strong className={`score-value ${verdictInfo.className}`}>
                        {deepScanResult.verdict}
                      </strong>
                      <span className="score-sub">Behavioral runtime classification</span>
                    </div>

                    <div className="score-box">
                      <span className="score-label">Confidence Score</span>
                      <strong className="score-value">
                        {typeof deepScanResult.confidence === 'number'
                          ? `${(deepScanResult.confidence * 100).toFixed(1)}%`
                          : deepScanResult.confidence}
                      </strong>
                      <span className="score-sub">
                        Relative confidence rating ({Number(deepScanResult.confidence).toFixed(2)})
                      </span>
                    </div>

                    <div className="score-box">
                      <span className="score-label">Redirect Hops</span>
                      <strong className="score-value">
                        {deepScanResult.redirect_chain?.length || 1}
                      </strong>
                      <span className="score-sub">Total navigation transitions observed</span>
                    </div>
                  </div>

                  <div className="findings-section">
                    <h4>Observed Navigation & Redirect Chain</h4>
                    <div className="redirect-chain-list">
                      {deepScanResult.redirect_chain && deepScanResult.redirect_chain.length > 0 ? (
                        deepScanResult.redirect_chain.map((hop, i) => (
                          <div className="redirect-hop-item" key={i}>
                            <div className="hop-index">
                              {i === 0
                                ? 'Origin'
                                : i === deepScanResult.redirect_chain.length - 1
                                ? 'Final'
                                : `Hop ${i}`}
                            </div>
                            <div className="hop-url" title={hop}>
                              {hop}
                            </div>
                            {i < deepScanResult.redirect_chain.length - 1 && (
                              <div className="hop-arrow">
                                <Icon name="arrow-right" size={14} />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-flags">Single direct navigation without redirects.</p>
                      )}
                    </div>
                  </div>

                  {deepScanResult.screenshot && (
                    <div className="screenshot-section">
                      <h4>Sandbox Rendered Viewport Screenshot</h4>
                      <div className="screenshot-frame">
                        <div className="screenshot-topbar">
                          <span className="browser-dot red"></span>
                          <span className="browser-dot yellow"></span>
                          <span className="browser-dot green"></span>
                          <span className="browser-address">{deepScanResult.scanned_url || url}</span>
                        </div>
                        <img
                          src={screenshotSrc}
                          alt="Sandbox viewport preview"
                          className="screenshot-image"
                        />
                      </div>
                    </div>
                  )}

                  <div className="findings-section" style={{ marginTop: '28px' }}>
                    <h4>Detection Signals</h4>
                    <div className="reasons-list">
                      {deepScanResult.reasons && deepScanResult.reasons.length > 0 ? (
                        deepScanResult.reasons.map((reason, idx) => (
                          <div className="reason-item" key={idx}>
                            <span className="signal-index">{idx + 1}</span>
                            <div className="reason-content">
                              <strong>{reason}</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-flags">No threat indicators triggered during sandbox execution.</p>
                      )}
                    </div>
                  </div>

                  {deepScanResult.packet_telemetry && (
                    <div className="telemetry-section">
                      <h4>Network Layer Analysis</h4>
                      <div className="telemetry-card">
                        <div className="telemetry-row header-row">
                          <div>
                            <span className="telemetry-tag">Network Wire Inspection</span>
                            <h5>Outbound Network &amp; Credential Transmission Log</h5>
                          </div>
                        </div>

                        <div className="telemetry-grid">
                          <div className="telemetry-box">
                            <span className="telemetry-label">Source &amp; Destination IP</span>
                            <strong>
                              {deepScanResult.packet_telemetry.source_ip} ➔ {deepScanResult.packet_telemetry.destination_ip}
                            </strong>
                            <span className="telemetry-sub">
                              Port: {deepScanResult.packet_telemetry.destination_port}
                            </span>
                          </div>

                          <div className="telemetry-box">
                            <span className="telemetry-label">Fake Credentials</span>
                            <strong>
                              {deepScanResult.packet_telemetry.canary_injection.form_found
                                ? (deepScanResult.packet_telemetry.canary_injection.canary_user || 'Technoblade@never.die')
                                : 'NA'}
                            </strong>
                            <span className="telemetry-sub">
                              {deepScanResult.packet_telemetry.canary_injection.form_found ? (
                                <>Password: <code>{deepScanResult.packet_telemetry.canary_injection.canary_pass || '12345678'}</code></>
                              ) : (
                                'Password: NA'
                              )}
                            </span>
                          </div>

                          <div className="telemetry-box">
                            <span className="telemetry-label">Sharing Credential to Any Link</span>
                            <strong title={deepScanResult.packet_telemetry.canary_injection.post_destination}>
                              {deepScanResult.packet_telemetry.canary_injection.form_found
                                ? deepScanResult.packet_telemetry.canary_injection.post_destination
                                : 'NA'}
                            </strong>
                            <span
                              className={`telemetry-sub ${
                                deepScanResult.packet_telemetry.canary_injection.destination_mismatch
                                  ? 'text-danger'
                                  : ''
                              }`}
                            >
                              {deepScanResult.packet_telemetry.canary_injection.form_found ? (
                                deepScanResult.packet_telemetry.canary_injection.destination_mismatch
                                  ? '⚠️ Warning: Form redirects credentials to external unverified link!'
                                  : 'Submitted only to origin link'
                              ) : (
                                'No credential transmission observed'
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="telemetry-details">
                          <div className="telemetry-detail-item">
                            <span>Credential Verification &amp; Encoder:</span>
                            <em>
                              {deepScanResult.packet_telemetry.canary_injection.form_found ? (
                                <>
                                  {deepScanResult.packet_telemetry.canary_injection.password_status ||
                                    'Password rejected as incorrect (fake account, as expected)'}
                                  {' | '}
                                  Encoder Used: <code>{deepScanResult.packet_telemetry.canary_injection.encoding_detected || 'POST Application/x-www-form-urlencoded'}</code>
                                </>
                              ) : (
                                <>NA (No login input found on page) | Encoder Used: <code>NA</code></>
                              )}
                            </em>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </section>
        )}

        {result && (
          <section className="result-card">
            {(() => {
              const verdict = getVerdictDetails(result.decision)
              return (
                <>
                  <div className={`verdict-banner ${verdict.className}`}>
                    <div className="verdict-icon">
                      <Icon name={verdict.iconName} size={28} />
                    </div>
                    <div className="verdict-text">
                      <div className="verdict-header">
                        <h3>{verdict.title}</h3>
                        <span className="verdict-badge">{verdict.badgeText}</span>
                      </div>
                      <p>{verdict.description}</p>
                      <div className="url-preview">{result.normalized_url}</div>

                      {result.decision === 'block' && (
                        <div
                          className={`protection-status-banner ${
                            protectionEnabled ? 'blocked-active' : 'monitor-mode'
                          }`}
                        >
                          <Icon name={protectionEnabled ? 'shield' : 'eye'} size={16} />
                          <div>
                            {protectionEnabled ? (
                              <>
                                <strong>Active Interception On:</strong> Navigation is restricted. In the browser extension, users are prevented from opening this page.
                              </>
                            ) : (
                              <>
                                <strong>Monitoring Mode Only:</strong> Threat was identified and logged, but automatic blocking is turned off.
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="scores-grid">
                    <div className="score-box">
                      <span className="score-label">Overall Risk</span>
                      <strong className={`score-value ${verdict.className}`}>
                        {Number(result.risk_score).toFixed(1)}%
                      </strong>
                      <span className="score-sub">Weighted threat assessment</span>
                    </div>

                    <div className="score-box">
                      <span className="score-label">Heuristic Rules</span>
                      <strong className="score-value">{result.heuristic_score} / 100</strong>
                      <span className="score-sub">Keyword & pattern flags</span>
                    </div>

                    <div className="score-box">
                      <span className="score-label">ML Classifier</span>
                      <strong className="score-value">{result.model_probability_percent}%</strong>
                      <span className="score-sub">Random Forest prediction</span>
                    </div>

                    <div className="score-box">
                      <span className="score-label">Telemetry Coverage</span>
                      <strong className="score-value">{Number(result.confidence ?? 0).toFixed(0)}%</strong>
                      <span className="score-sub">Available evidence signals</span>
                    </div>
                  </div>

                  <div className="findings-section">
                    <h4>Evaluation Details</h4>
                    <div className="reasons-list">
                      {result.reasons && result.reasons.length > 0 ? (
                        result.reasons.map((r, i) => (
                          <div className="reason-item" key={i}>
                            <span className="signal-index">{i + 1}</span>
                            <div className="reason-content">
                              <strong>{r.title}</strong>
                              <p>{r.detail}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-flags">No suspicious characteristics were identified.</p>
                      )}
                    </div>
                  </div>

                  {result.page_analysis && (
                    <div className="metadata-strip">
                      <div className="meta-item">
                        <span>HTTP Response:</span>
                        <strong>{result.page_analysis.status || 'Resolved'}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Page Title:</span>
                        <strong>{result.page_analysis.title || 'Untitled'}</strong>
                      </div>
                      <div className="meta-item">
                        <span>Registered Entity:</span>
                        <strong>
                          {result.trusted_domain ? result.trusted_domain.name : 'Unregistered Domain'}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="features-accordion">
                    <button
                      type="button"
                      className="features-toggle"
                      onClick={() => setShowFeatures(!showFeatures)}
                    >
                      {showFeatures ? 'Hide' : 'Inspect'} the 15 extracted URL characteristics
                    </button>

                    {showFeatures && result.features && (
                      <div className="features-table-wrap">
                        <table className="features-table">
                          <thead>
                            <tr>
                              <th>Feature</th>
                              <th>Value</th>
                              <th>What this measures</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(result.features).map(([k, v]) => (
                              <tr key={k}>
                                <td>
                                  <code>{k}</code>
                                </td>
                                <td>
                                  <strong>{typeof v === 'number' ? Number(v).toFixed(2) : String(v)}</strong>
                                </td>
                                <td>{getFeatureDescription(k)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="result-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleDownloadPdf(result.analysis_id)}
                    >
                      <Icon name="file-text" size={15} />
                      <span>Download Security Report (PDF)</span>
                    </button>
                  </div>
                </>
              )
            })()}
          </section>
        )}

        <section className="history-section">
          <div className="history-header">
            <div>
              <h3>Recent Scans</h3>
              <p>Previous link evaluations from this session. You can review findings or export audit reports.</p>
            </div>

            <div className="history-buttons">
              <button type="button" className="btn-secondary" onClick={handleExportCsv}>
                <Icon name="download" size={14} />
                <span>Export CSV</span>
              </button>
              <button type="button" className="btn-secondary" onClick={fetchData}>
                <Icon name="refresh" size={14} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="history-toolbar">
            <div className="history-search-wrap">
              <Icon name="search" size={14} className="search-icon" />
              <input
                type="text"
                className="history-search"
                placeholder="Search scans by URL or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              {[
                { id: 'all', label: 'All' },
                { id: 'allow', label: 'Clean' },
                { id: 'review', label: 'Review' },
                { id: 'block', label: 'Blocked' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-chip ${filter === f.id ? 'active' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-history">
                <p>No previous scans found. Enter a link above to get started.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>URL</th>
                      <th>Risk Score</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`status-pill pill-${item.decision}`}>
                            {item.decision.toUpperCase()}
                          </span>
                        </td>
                        <td className="url-cell" title={item.url}>
                          {item.url}
                        </td>
                        <td>
                          <strong>{Number(item.risk_score).toFixed(1)}%</strong>
                        </td>
                        <td className="date-cell">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => handleViewDetails(item.id)}
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => handleDownloadPdf(item.id)}
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="info-card">
          <div className="info-header">
            <h3>How the detection system works</h3>
            <p>PhishGuard combines independent layers of defense to inspect links without relying on a single point of failure.</p>
          </div>
          <div className="info-grid">
            <div className="info-box">
              <div className="info-icon">
                <Icon name="layers" size={22} />
              </div>
              <h4>1. Structural & Lexical Rules</h4>
              <p>Flags deceptive character tricks, homoglyphs, IP address hostnames, lookalike brands, and known abusive domain extensions.</p>
            </div>
            <div className="info-box">
              <div className="info-icon">
                <Icon name="cpu" size={22} />
              </div>
              <h4>2. Machine Learning Model</h4>
              <p>Evaluates Shannon entropy, path depth, parameter count, and structural character distributions against historical phishing data.</p>
            </div>
            <div className="info-box">
              <div className="info-icon">
                <Icon name="terminal" size={22} />
              </div>
              <h4>3. Sandbox Emulation</h4>
              <p>Executes deep browser emulation to record redirect chains, inspect loaded forms, and capture visual page screenshots.</p>
            </div>
            <div className="info-box">
              <div className="info-icon">
                <Icon name="shield" size={22} />
              </div>
              <h4>4. Prevention & Interception</h4>
              <p>Integrates with the browser extension to intercept navigation before malicious scripts can harvest passwords or tokens.</p>
            </div>
          </div>
        </section>
      </main>

      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Scan Details #{selectedRecord.analysis_id}</h3>
                <p className="modal-url">{selectedRecord.normalized_url}</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-stats">
                <div>
                  <span>Verdict</span>
                  <strong className={`status-pill pill-${selectedRecord.decision}`}>
                    {selectedRecord.decision.toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span>Risk Score</span>
                  <strong>{Number(selectedRecord.risk_score).toFixed(1)}%</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{Number(selectedRecord.confidence ?? 0).toFixed(0)}%</strong>
                </div>
              </div>

              <h4>Triggered Indicators:</h4>
              <div className="modal-reasons">
                {selectedRecord.reasons && selectedRecord.reasons.length > 0 ? (
                  selectedRecord.reasons.map((r, i) => (
                    <div className="modal-reason-row" key={i}>
                      <b>{r.title}</b>
                      <span>{r.detail}</span>
                    </div>
                  ))
                ) : (
                  <p>No warning indicators found.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleDownloadPdf(selectedRecord.analysis_id)}
              >
                <Icon name="file-text" size={15} />
                <span>Download Report (PDF)</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>PhishGuard — Intrusion Detection & Prevention System Prototype</p>
      </footer>
    </div>
  )
}

function getFeatureDescription(feature) {
  const descriptions = {
    url_length: 'Total character length of the entire URL string',
    num_dots: 'Number of dot separators in the domain hostname',
    has_https: '1 if secure HTTPS protocol is active, 0 for plain HTTP',
    has_ip: '1 if the host uses a raw IPv4/IPv6 address instead of a domain name',
    num_subdirs: 'Depth of the path folder structure',
    num_params: 'Count of URL query parameters used in GET requests',
    suspicious_words: 'Count of lure keywords like login, verify, account, or secure',
    special_char_count: 'Count of non-alphanumeric symbols present in the URL',
    digits_count: 'Count of numerical digits in the URL string',
    entropy: 'Shannon randomness score; higher values indicate generated hashes',
    num_subdomains: 'Depth of subdomains preceding the registrable domain',
    has_at: 'Presence of @ symbol, often used to obscure real host destinations',
    has_fragment: '1 if the URL contains a # fragment anchor identifier',
    domain_length: 'Character length of the hostname',
    hyphen_count: 'Count of hyphens in the domain, commonly used in lookalikes',
  }
  return descriptions[feature] || 'Structural URL attribute'
}
