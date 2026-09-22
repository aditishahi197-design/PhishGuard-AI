import React, { useEffect, useMemo, useState } from 'react'

const API = '/api'

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    shield: <><path d="M12 3l7 3v5c0 4.8-3 8.5-7 10-4-1.5-7-5.2-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 7 20l1.1-1.1"/></>,
    block: <><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></>,
    review: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>,
    risk: <><path d="M10.3 4.2 2.7 17.5A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.5L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></>,
    report: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h6M9 8h2"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-6"/></>,
    download: <><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 19h14"/></>,
    eye: <><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    database: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function Badge({ decision }) {
  const text = decision === 'block' ? 'BLOCKED' : decision === 'review' ? 'REVIEW' : 'SAFE'
  return <span className={`badge ${decision}`}>{text}</span>
}

function Metric({ title, value, note, icon, tone = '' }) {
  return <div className={`metric ${tone}`}><div className="metric-icon"><Icon name={icon} size={17}/></div><span>{title}</span><strong>{value}</strong><small>{note}</small></div>
}

function ChartCard({ title, subtitle, children }) {
  return <div className="chart-card"><div className="chart-head"><div><h3>{title}</h3><p>{subtitle}</p></div><Icon name="chart" size={18}/></div>{children}</div>
}

function RiskChart({ rows }) {
  const data = [...rows].reverse().slice(-12)
  if (!data.length) return <div className="chart-empty">Analyze URLs to build the risk trend.</div>
  const width = 520, height = 190, padX = 28, padY = 24
  const coords = data.map((r, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1)
    const y = height - padY - (Math.max(0, Math.min(100, Number(r.risk_score))) / 100) * (height - padY * 2)
    return [x, y]
  })
  return <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Risk score trend">
    <line className="axis" x1={padX} y1={padY} x2={padX} y2={height-padY}/><line className="axis" x1={padX} y1={height-padY} x2={width-padX} y2={height-padY}/>
    <line className="gridline" x1={padX} y1={height/2} x2={width-padX} y2={height/2}/>
    <polyline points={coords.map(([x,y])=>`${x},${y}`).join(' ')} className="risk-line"/>
    {coords.map(([x,y],i)=><circle key={data[i].id} cx={x} cy={y} r="4" className="risk-dot"><title>{`${Number(data[i].risk_score).toFixed(1)}% — ${data[i].url}`}</title></circle>)}
    <text x="5" y={padY+4}>100%</text><text x="9" y={height/2+4}>50%</text><text x="14" y={height-padY+4}>0%</text>
  </svg>
}

function DistributionChart({ rows }) {
  const counts = { allow: 0, review: 0, block: 0 }
  rows.forEach(r => { counts[r.decision] = (counts[r.decision] || 0) + 1 })
  const total = rows.length || 1
  return <div className="distribution">{[['allow','Safe','check'],['review','Review','review'],['block','Blocked','block']].map(([key,label,icon]) => <div className="dist-row" key={key}><div className={`dist-icon ${key}`}><Icon name={icon} size={17}/></div><div className="dist-main"><div><span>{label}</span><b>{counts[key] || 0}</b></div><div className="bar"><i className={key} style={{width:`${((counts[key] || 0)/total)*100}%`}}/></div></div></div>)}</div>
}

function Performance({ performance }) {
  if (!performance?.available) return <div className="performance-empty"><Icon name="database" size={22}/><div><strong>Model performance unavailable</strong><p>Run <code>python train_model.py</code> to generate evaluation metrics for the dashboard.</p></div></div>
  const metrics = [['Accuracy',performance.accuracy],['Precision',performance.precision],['Recall',performance.recall],['F1 Score',performance.f1]]
  return <><div className="performance-grid">{metrics.map(([name,value])=><div className="performance-card" key={name}><span>{name}</span><strong>{(Number(value)*100).toFixed(1)}%</strong></div>)}</div><div className="performance-foot">{performance.rows_used?.toLocaleString()} labeled URLs evaluated · {performance.feature_count} URL features · {performance.model_type}</div>{performance.confusion_matrix?.length === 2 && <div className="confusion"><h3>Confusion matrix</h3><div className="matrix"><div></div><div>Predicted Legitimate</div><div>Predicted Phishing</div><div>Actual Legitimate</div><strong>{performance.confusion_matrix[0][0]}</strong><strong>{performance.confusion_matrix[0][1]}</strong><div>Actual Phishing</div><strong>{performance.confusion_matrix[1][0]}</strong><strong>{performance.confusion_matrix[1][1]}</strong></div></div>}</>
}

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ total: 0, blocked: 0, review: 0, allowed: 0, avg_risk: 0 })
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [protection, setProtection] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [modal, setModal] = useState(false)

  async function refresh() {
    try {
      const [h,s,p] = await Promise.all([
        fetch(`${API}/history`).then(async r=>{if(!r.ok)throw new Error();return r.json()}),
        fetch(`${API}/stats`).then(async r=>{if(!r.ok)throw new Error();return r.json()}),
        fetch(`${API}/model-performance`).then(async r=>{if(!r.ok)throw new Error();return r.json()})
      ])
      setHistory(h); setStats(s); setPerformance(p); setError('')
    } catch { setError('Backend is not reachable. Start the PhishGuard Flask backend and refresh this page.') }
  }
  useEffect(()=>{refresh()},[])

  async function analyze(e) {
    e?.preventDefault(); if(!url.trim()){setError('Enter a URL before starting the analysis.');return}
    setLoading(true);setError('')
    try {
      const r=await fetch(`${API}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.trim()})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Analysis failed');setResult(data);await refresh()
    } catch(err){setError(err.message)} finally{setLoading(false)}
  }

  async function downloadReport(id){
    if(!id)return
    try{const r=await fetch(`${API}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis_id:id})});if(!r.ok)throw new Error('Report generation failed.');const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`phishguard-report-${id}.pdf`;a.click();URL.revokeObjectURL(a.href)}catch(err){setError(err.message)}
  }

  async function openDetails(id){
    setDetailLoading(true);setError('')
    try{const r=await fetch(`${API}/history/${id}`);const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not load analysis details');setResult(data);setModal(true)}catch(err){setError(err.message)}finally{setDetailLoading(false)}
  }

  async function sendFeedback(expected_label){
    if(!result?.analysis_id)return
    const r=await fetch(`${API}/feedback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis_id:result.analysis_id,expected_label})})
    if(r.ok)setError('Feedback saved for future model improvement.')
  }

  function exportCsv(){
    if(!history.length){setError('There is no analysis history to export.');return}
    const header=['ID','URL','Decision','Label','Risk Score','Created At'];const lines=[header,...history.map(r=>[r.id,r.url,r.decision,r.label,Number(r.risk_score).toFixed(2),r.created_at])].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','));const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='phishguard-analysis-history.csv';a.click();URL.revokeObjectURL(a.href)
  }

  const filteredHistory=useMemo(()=>history.filter(row=>{const matches=filter==='all'||row.decision===filter;const q=search.trim().toLowerCase();return matches&&(!q||row.url.toLowerCase().includes(q)||row.label.toLowerCase().includes(q))}),[history,filter,search])
  const featureEntries=useMemo(()=>Object.entries(result?.features||{}),[result])

  return <div className="app">
    <header className="topbar"><div className="brand-wrap"><div className="brand-mark"><Icon name="shield" size={23}/></div><div><div className="brand">PhishGuard AI</div><div className="tagline">Detect phishing before you trust the link.</div></div></div><div className="protection"><span className={`dot ${protection?'on':''}`}></span><span>Protection {protection?'ON':'OFF'}</span><button onClick={()=>setProtection(v=>!v)}>{protection?'Disable':'Enable'}</button></div></header>
    <main>
      <section className="hero card"><div className="eyebrow">AI + HEURISTIC URL DEFENSE</div><h1>Analyze a suspicious URL</h1><p>PhishGuard combines URL structure, ML signals, rules, legitimate-domain verification, and live page analysis.</p><form onSubmit={analyze} className="search-row"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Enter a URL to analyze..." autoComplete="off"/><button className="primary" disabled={loading}>{loading?'Analyzing…':'Analyze URL'}</button></form>{error&&<div className="notice">{error}</div>}</section>
      <section className="stats-grid"><div className="stat card"><div className="stat-icon"><Icon name="link" size={20}/></div><span>Scans</span><strong>{stats.total}</strong><small>Total URL analyses</small></div><div className="stat card"><div className="stat-icon"><Icon name="block" size={20}/></div><span>Blocked</span><strong>{stats.blocked}</strong><small>High-risk decisions</small></div><div className="stat card"><div className="stat-icon"><Icon name="review" size={20}/></div><span>Needs review</span><strong>{stats.review}</strong><small>Manual verification</small></div><div className="stat card"><div className="stat-icon"><Icon name="risk" size={20}/></div><span>Average risk</span><strong>{Number(stats.avg_risk||0).toFixed(1)}%</strong><small>Across analyzed URLs</small></div></section>

      {result&&<section className={`result card ${result.decision}`}><div className="result-head"><div><div className="eyebrow">LATEST ANALYSIS</div><div className="result-title-row"><h2>{result.label}</h2><Badge decision={result.decision}/></div><div className="url-text">{result.normalized_url}</div></div><div className="result-actions"><button onClick={()=>downloadReport(result.analysis_id)}><Icon name="report" size={17}/> Generate PDF report</button></div></div>
        <div className="result-grid"><div className="score"><div className="score-number">{Number(result.risk_score).toFixed(1)}%</div><div className="muted">final risk score</div></div><Metric icon="chart" title="ML model signal" value={`${result.model_probability_percent}%`} note="calibrated model evidence"/><Metric icon="shield" title="Heuristic score" value={`${result.heuristic_score}/100`} note="rule-based URL signals"/><Metric icon="link" title="Evidence confidence" value={`${result.confidence ?? 0}%`} note="coverage of available evidence"/></div>
        {protection&&result.decision==='block'&&<div className="block-panel"><strong>Navigation blocked in protection mode</strong><p>The in-app protection flow stops the user before continuing. The included browser extension can provide navigation-level blocking.</p></div>}
        {result.decision==='review'&&<div className="review-panel"><strong>Review before trusting this link</strong><p>Verify the destination independently and avoid entering credentials until the destination is confirmed.</p></div>}
        {result.decision==='allow'&&<div className="safe-panel"><strong>Low-risk assessment</strong><p>The available URL signals produced a low-risk assessment.</p></div>}
        <div className="evidence-strip"><div><span>Live page check</span><b>{result.page_analysis?.available ? result.page_analysis.status : "Unavailable"}</b></div><div><span>Evidence source</span><b>{result.assessment_source}</b></div></div><div className="two-col"><div><h3>Why this result?</h3><div className="reasons">{result.reasons.map((r,i)=><div className="reason" key={i}><b>{r.title}</b><span>{r.detail}</span>{r.points>0&&<em>+{r.points}</em>}</div>)}</div></div><div><h3>URL characteristics</h3><div className="features">{featureEntries.map(([k,v])=><div className="feature" key={k}><span>{k.replaceAll('_',' ')}</span><b>{typeof v==='number'?Number(v).toFixed(2):v}</b></div>)}</div></div></div>
        <div className="feedback"><span>Was this result wrong?</span><button onClick={()=>sendFeedback('legitimate')}>Mark legitimate</button><button onClick={()=>sendFeedback('phishing')}>Mark phishing</button></div>
      </section>}

      <section className="card history-card"><div className="section-head"><div><div className="eyebrow">AUDIT TRAIL</div><h2>Analysis history</h2><p className="section-copy">Review previous scans, inspect details, and generate a report without re-running the URL.</p></div><div className="history-tools"><button onClick={exportCsv}><Icon name="download" size={16}/> Export CSV</button><button onClick={refresh}>Refresh</button></div></div>
        <div className="history-controls"><div className="history-search"><Icon name="search" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search analyzed URLs..."/></div><div className="filter-group">{[['all','All'],['allow','Safe'],['review','Review'],['block','Blocked']].map(([key,label])=><button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
        <div className="charts-grid"><ChartCard title="Risk trend" subtitle="Recent analysis risk scores"><RiskChart rows={history}/></ChartCard><ChartCard title="Detection distribution" subtitle="Decisions across the current history"><DistributionChart rows={history}/></ChartCard></div>
        <div className="history-list">{filteredHistory.length===0?<div className="empty">{history.length?'No history matches the current filter.':'No analyses yet.'}</div>:filteredHistory.map(row=><div className="history-row" key={row.id}><div className="history-main"><div className="history-url"><Icon name="link" size={16}/><b title={row.url}>{row.url}</b></div><small><Icon name="calendar" size={14}/>{new Date(row.created_at).toLocaleString()}</small></div><div className="history-actions"><Badge decision={row.decision}/><strong>{Number(row.risk_score).toFixed(1)}%</strong><button onClick={()=>openDetails(row.id)} disabled={detailLoading}><Icon name="eye" size={15}/> View</button><button onClick={()=>downloadReport(row.id)}><Icon name="report" size={15}/> Generate report</button></div></div>)}</div>
      </section>

      <section className="card performance-section"><div className="section-head"><div><div className="eyebrow">MODEL EVALUATION</div><h2>Model performance</h2><p className="section-copy">Evaluation metrics from the most recent training run.</p></div></div><Performance performance={performance}/></section>
    </main>

    {modal&&result&&<div className="modal-backdrop" onMouseDown={()=>setModal(false)}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">ANALYSIS DETAILS</div><h2>{result.label}</h2><p>{result.normalized_url}</p></div><button className="icon-button" onClick={()=>setModal(false)} aria-label="Close"><Icon name="close" size={19}/></button></div><div className="modal-grid"><div><span>Risk score</span><strong>{Number(result.risk_score).toFixed(1)}%</strong></div><div><span>ML signal</span><strong>{result.model_probability_percent}%</strong></div><div><span>Evidence confidence</span><strong>{result.confidence ?? 0}%</strong></div></div><h3>Why this result?</h3><div className="reasons">{result.reasons.map((r,i)=><div className="reason" key={i}><b>{r.title}</b><span>{r.detail}</span></div>)}</div><div className="modal-actions"><button onClick={()=>downloadReport(result.analysis_id)}><Icon name="report" size={16}/> Generate report</button><button className="secondary" onClick={()=>setModal(false)}>Close</button></div></div></div>}
  </div>
}
