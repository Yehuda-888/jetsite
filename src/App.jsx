import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import AircraftProfile from './components/AircraftProfile'
import aircraftData from './data/aircraft.json'
import modelsManifest from './data/models.manifest.json'
import { useWikiSummaries } from './hooks/useWikiSummaries'

const ANALYZE_LIMIT = 6

const ANALYZE_COLORS = ['#00ff00', '#00ffff', '#ff003c', '#ffd400', '#ff8800', '#7dff7d']

const ANALYZE_METRICS = [
  { key: 'topSpeedKmh', label: 'TOP_SPEED', unit: 'km/h', color: '#00ff00', higherBetter: true, weight: 1.2 },
  { key: 'rangeKm', label: 'FERRY_RANGE', unit: 'km', color: '#00ffff', higherBetter: true, weight: 1.1 },
  { key: 'combatRadiusKm', label: 'COMBAT_RADIUS', unit: 'km', color: '#66ffcc', higherBetter: true, weight: 1.1 },
  { key: 'serviceCeilingM', label: 'SERVICE_CEILING', unit: 'm', color: '#ff003c', higherBetter: true, weight: 0.9 },
  { key: 'thrustKn', label: 'TOTAL_THRUST', unit: 'kN', color: '#33ffaa', higherBetter: true, weight: 1.1 },
  { key: 'climbRateMs', label: 'CLIMB_RATE', unit: 'm/s', color: '#aaff00', higherBetter: true, weight: 1 },
  { key: 'payloadKg', label: 'PAYLOAD', unit: 'kg', color: '#00ff88', higherBetter: true, weight: 1 },
  { key: 'hardpoints', label: 'HARDPOINTS', unit: '', color: '#44ffaa', higherBetter: true, weight: 0.6 },
  { key: 'radarRangeKm', label: 'RADAR_RANGE', unit: 'km', color: '#00ccff', higherBetter: true, weight: 1 },
  { key: 'stealthScore', label: 'STEALTH_SCORE', unit: '/10', color: '#88ff88', higherBetter: true, weight: 1.2 },
  { key: 'maxTakeoffWeightKg', label: 'MTOW', unit: 'kg', color: '#ffaa00', higherBetter: true, weight: 0.7 },
  { key: 'unitCostMUsd', label: 'UNIT_COST', unit: 'M USD', color: '#ff6680', higherBetter: false, weight: 0.9 }
]

const METRIC_BY_KEY = ANALYZE_METRICS.reduce((table, metric) => {
  table[metric.key] = metric
  return table
}, {})

const RADAR_AXES = ['topSpeedKmh', 'combatRadiusKm', 'serviceCeilingM', 'radarRangeKm', 'stealthScore', 'payloadKg'].map(
  (key) => METRIC_BY_KEY[key]
)

function valueOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatMetric(value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'NaN'
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1
  })
  return unit ? `${formatter.format(value)} ${unit}` : formatter.format(value)
}

function buildMetricStats(aircraftList) {
  return ANALYZE_METRICS.reduce((stats, metric) => {
    const values = aircraftList.map((aircraft) => valueOrZero(aircraft[metric.key]))
    const min = values.length ? Math.min(...values) : 0
    const max = values.length ? Math.max(...values) : 1
    stats[metric.key] = {
      min,
      max,
      span: Math.max(max - min, 1)
    }
    return stats
  }, {})
}

function normalizedMetric(aircraft, metric, metricStats) {
  const stats = metricStats[metric.key]
  if (!stats) return 0

  const value = valueOrZero(aircraft[metric.key])
  if (stats.max === stats.min) {
    return 1
  }

  const baseline = (value - stats.min) / stats.span
  const normalized = metric.higherBetter ? baseline : 1 - baseline
  return Math.max(0, Math.min(1, normalized))
}

function computeAnalyzeScore(aircraft, metricStats) {
  const totalWeight = ANALYZE_METRICS.reduce((sum, metric) => sum + metric.weight, 0)
  if (totalWeight <= 0) return 0

  const weighted = ANALYZE_METRICS.reduce((sum, metric) => {
    return sum + normalizedMetric(aircraft, metric, metricStats) * metric.weight
  }, 0)

  return Math.round((weighted / totalWeight) * 100)
}

function metricLeader(aircraftList, metric, metricStats) {
  if (!metric || aircraftList.length === 0) return null
  return [...aircraftList].sort((a, b) => {
    const delta = normalizedMetric(b, metric, metricStats) - normalizedMetric(a, metric, metricStats)
    if (delta !== 0) return delta
    return a.name.localeCompare(b.name)
  })[0]
}

function scoreboardFor(aircraftList, metricStats) {
  return aircraftList
    .map((aircraft) => ({ ...aircraft, score: computeAnalyzeScore(aircraft, metricStats) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

function PageTransition({ children }) {
  const location = useLocation()
  const [currentPath, setCurrentPath] = useState(location.pathname)
  const [isBooting, setIsBooting] = useState(true)
  const [progress, setProgress] = useState(0)

  if (location.pathname !== currentPath) {
    setCurrentPath(location.pathname)
    setIsBooting(true)
    setProgress(0)
  }

  useEffect(() => {
    if (!isBooting) return

    let active = true
    const interval = setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          clearInterval(interval)
          if (active) {
            setTimeout(() => {
              if (active) setIsBooting(false)
            }, 200)
          }
          return 100
        }
        return Math.min(100, current + Math.floor(Math.random() * 25) + 5)
      })
    }, 60)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [currentPath, isBooting])

  if (isBooting) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-10 font-mono text-[#0f0] min-h-[60vh]">
        <div className="w-full max-w-2xl border-2 border-[#0f0] p-8 bg-black shadow-[0_0_30px_rgba(0,255,0,0.2)] terminal-panel">
          <p className="font-pixel text-xl mb-6 glitch-text" data-text="> DECRYPTING_SECTOR_DATA...">
            &gt; DECRYPTING_SECTOR_DATA...
          </p>
          <div className="space-y-2 mb-6 text-sm">
            <p className="opacity-80">
              BYPASSING FIREWALLS: <span className="text-[#0f0]">[OK]</span>
            </p>
            <p className="opacity-80">
              ESTABLISHING SECURE UPLINK: <span className="text-[#0f0]">[OK]</span>
            </p>
            {progress > 40 && (
              <p className="opacity-80">
                INJECTING OVERRIDE PROTOCOLS: <span className="text-[#0f0]">[OK]</span>
              </p>
            )}
            <p className="opacity-80 mt-4 text-[#0f0]">FETCHING CLASSIFIED_INFO: [{progress}%]</p>
          </div>
          <div className="w-full h-6 border-2 border-[#0f0] bg-black p-1">
            <div className="h-full bg-[#0f0] transition-all duration-75" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-xs opacity-50 text-right animate-pulse">
            AWAITING HANDSHAKE <span className="cursor-blink">|</span>
          </p>
        </div>
      </div>
    )
  }

  return <div className="animate-in fade-in duration-300 h-full">{children}</div>
}

function AnalyzeRadar({ compareAircraft, metricStats }) {
  const size = 420
  const center = size / 2
  const radius = 155
  const angleStep = (Math.PI * 2) / RADAR_AXES.length

  const axisPoints = RADAR_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + index * angleStep
    return {
      axis,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      lx: center + Math.cos(angle) * (radius + 18),
      ly: center + Math.sin(angle) * (radius + 18)
    }
  })

  const ringPoints = [0.2, 0.4, 0.6, 0.8, 1]

  const buildRing = (level) => {
    return axisPoints
      .map((point) => `${center + (point.x - center) * level},${center + (point.y - center) * level}`)
      .join(' ')
  }

  const buildPolygon = (aircraft) => {
    return axisPoints
      .map((point) => {
        const normalized = normalizedMetric(aircraft, point.axis, metricStats)
        const scaled = 0.08 + normalized * 0.92
        const x = center + (point.x - center) * scaled
        const y = center + (point.y - center) * scaled
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <div className="w-full border border-[#0f0] bg-[#001100] p-4">
      <div className="aspect-square w-full max-w-[420px] mx-auto">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" role="img" aria-label="Analyze radar chart">
          {ringPoints.map((level) => (
            <polygon key={level} points={buildRing(level)} fill="none" stroke="rgba(0,255,0,0.25)" strokeWidth="1" />
          ))}

          {axisPoints.map((point) => (
            <g key={point.axis.key}>
              <line x1={center} y1={center} x2={point.x} y2={point.y} stroke="rgba(0,255,0,0.35)" strokeWidth="1" />
              <text x={point.lx} y={point.ly} fill="#00ff00" fontSize="10" textAnchor="middle" dominantBaseline="middle">
                {point.axis.label.replace('SERVICE_', '').replace('_', ' ')}
              </text>
            </g>
          ))}

          {compareAircraft.map((aircraft, index) => (
            <polygon
              key={aircraft.id}
              points={buildPolygon(aircraft)}
              fill={`${ANALYZE_COLORS[index % ANALYZE_COLORS.length]}25`}
              stroke={ANALYZE_COLORS[index % ANALYZE_COLORS.length]}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
        {compareAircraft.map((aircraft, index) => (
          <div key={aircraft.id} className="flex items-center gap-2 border border-[#0f0]/30 px-2 py-1 bg-black/40">
            <span
              className="w-3 h-3 shrink-0"
              style={{ backgroundColor: ANALYZE_COLORS[index % ANALYZE_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="truncate">{aircraft.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyzePage({ compareAircraft, allAircraft, compareIds, metricStats, toggleCompare, clearCompare }) {
  const [selectionQuery, setSelectionQuery] = useState('')
  const activeMetricStats = useMemo(() => metricStats || buildMetricStats(compareAircraft), [compareAircraft, metricStats])
  const scoreboard = useMemo(() => scoreboardFor(compareAircraft, activeMetricStats), [compareAircraft, activeMetricStats])

  const leaders = useMemo(() => {
    if (compareAircraft.length === 0) return []
    return [
      { label: 'FASTEST', metric: METRIC_BY_KEY.topSpeedKmh },
      { label: 'LONGEST_REACH', metric: METRIC_BY_KEY.rangeKm },
      { label: 'BEST_RADAR', metric: METRIC_BY_KEY.radarRangeKm },
      { label: 'LOW_OBSERVABLE', metric: METRIC_BY_KEY.stealthScore },
      { label: 'COST_EFFICIENT', metric: METRIC_BY_KEY.unitCostMUsd }
    ].map((entry) => {
      const leader = metricLeader(compareAircraft, entry.metric, activeMetricStats)
      return {
        ...entry,
        leader,
        value: leader ? formatMetric(leader[entry.metric.key], entry.metric.unit) : 'NaN'
      }
    })
  }, [activeMetricStats, compareAircraft])

  const bestEfficiency = useMemo(() => {
    if (scoreboard.length === 0) return null
    return [...scoreboard]
      .map((item) => {
        const cost = valueOrZero(item.unitCostMUsd) || 1
        return {
          ...item,
          efficiency: item.score / cost
        }
      })
      .sort((a, b) => b.efficiency - a.efficiency)[0]
  }, [scoreboard])

  if (compareAircraft.length === 0) {
    const filteredAll = allAircraft
      ? allAircraft.filter((item) => item.name.toLowerCase().includes(selectionQuery.toLowerCase()))
      : []

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono">
        <div className="terminal-panel border-2 border-[#0f0] p-6 mb-6">
          <h1 className="font-pixel text-2xl md:text-4xl text-[#0f0] mb-2">Analyze</h1>
          <p className="text-[#0f0]/70 text-sm mb-4">
            Select up to {ANALYZE_LIMIT} aircraft to compare. Pick from the list below to get started.
          </p>
          <div className="relative mb-4">
            <span className="absolute left-2 top-2.5 text-[#0f0] font-bold">&gt;</span>
            <input
              type="text"
              value={selectionQuery}
              onChange={(event) => setSelectionQuery(event.target.value)}
              placeholder="Search aircraft..."
              className="w-full bg-black border border-[#0f0] pl-8 pr-4 py-2 text-[#0f0] outline-none transition-all placeholder:text-[#0f0]/40 focus:bg-[#002200]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAll.map((item) => {
            const inCompare = compareIds?.includes(item.id)
            const compareLocked = (compareIds?.length || 0) >= ANALYZE_LIMIT && !inCompare

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !compareLocked && toggleCompare(item.id)}
                disabled={compareLocked}
                className={`text-left border-2 p-4 transition-all ${
                  inCompare
                    ? 'border-[#0f0] bg-[#002200] shadow-[0_0_10px_rgba(0,255,0,0.3)]'
                    : compareLocked
                      ? 'border-[#0f0]/20 bg-black/50 opacity-40 cursor-not-allowed'
                      : 'border-[#0f0]/40 bg-black hover:border-[#0f0] hover:bg-[#001100] cursor-pointer'
                }`}
              >
                <h3 className="font-pixel text-sm text-[#0f0] mb-1">{item.name}</h3>
                <p className="text-[10px] text-[#0f0]/60 uppercase">{item.country} | {item.role} | Gen {item.generation}</p>
                <div className="mt-2 text-[10px] text-[#0f0]/50 space-y-0.5">
                  <div>Speed: {item.topSpeedKmh ? `${item.topSpeedKmh} km/h` : 'N/A'}</div>
                  <div>Range: {item.rangeKm ? `${item.rangeKm} km` : 'N/A'}</div>
                </div>
                {inCompare && (
                  <div className="mt-2 text-[10px] text-[#0f0] font-bold">SELECTED</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 font-mono">
      <header className="terminal-panel border-2 border-[#0f0] p-6 mb-6 shadow-[0_0_15px_#0f0]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-pixel text-2xl md:text-4xl text-[#0f0] glitch-text" data-text="TACTICAL_ANALYZE_SUITE_V3">
              TACTICAL_ANALYZE_SUITE_V3
            </h1>
            <p className="text-sm text-[#0f0]/70 mt-3">
              Active profiles: {compareAircraft.length}/{ANALYZE_LIMIT} | Composite scoring across {ANALYZE_METRICS.length}{' '}
              performance dimensions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/" className="text-xs border border-[#0f0] px-3 py-2 uppercase glitch-hover">
              [ BACK_TO_DB ]
            </Link>
            <button
              type="button"
              onClick={clearCompare}
              className="text-xs border border-[#ff003c] text-[#ff003c] px-3 py-2 uppercase glitch-hover hover:bg-[#ff003c] hover:text-black"
            >
              [ PURGE_ALL ]
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <article className="border border-[#0f0] bg-[#001100] p-4">
          <h2 className="text-xs text-[#0f0]/70 uppercase mb-2">Top Composite</h2>
          <p className="font-pixel text-lg text-[#0f0]">{scoreboard[0]?.name || 'N/A'}</p>
          <p className="text-xs mt-1">SCORE: {scoreboard[0]?.score ?? 0}/100</p>
        </article>

        <article className="border border-[#0f0] bg-[#001100] p-4">
          <h2 className="text-xs text-[#0f0]/70 uppercase mb-2">Best Score / Cost</h2>
          <p className="font-pixel text-lg text-[#0f0]">{bestEfficiency?.name || 'N/A'}</p>
          <p className="text-xs mt-1">EFF: {bestEfficiency ? bestEfficiency.efficiency.toFixed(2) : '0.00'}</p>
        </article>

        <article className="border border-[#0f0] bg-[#001100] p-4 md:col-span-2 xl:col-span-1">
          <h2 className="text-xs text-[#0f0]/70 uppercase mb-2">Quick Winner Matrix</h2>
          <div className="space-y-2 text-xs">
            {leaders.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-3 border border-[#0f0]/30 px-2 py-1 bg-black/30">
                <span className="text-[#0f0]/70">{entry.label}</span>
                <span className="truncate text-right">
                  {entry.leader?.name || 'N/A'} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {compareAircraft.length >= 2 ? (
        <section className="mb-6">
          <h2 className="font-pixel text-base text-[#0f0] mb-3">SIGNATURE_RADAR</h2>
          <AnalyzeRadar compareAircraft={compareAircraft} metricStats={activeMetricStats} />
        </section>
      ) : (
        <section className="mb-6 border border-[#ff003c] text-[#ff003c] bg-[#110000] p-4 text-sm">
          Queue at least two aircraft for differential radar overlays.
        </section>
      )}

      <section className="mb-6 border border-[#0f0] terminal-panel p-4 overflow-x-auto">
        <h2 className="font-pixel text-base text-[#0f0] mb-3">RANKING_BOARD</h2>
        <table className="w-full min-w-[860px] text-xs">
          <thead className="text-[#0f0]/70 border-b border-[#0f0]">
            <tr>
              <th className="text-left py-2">#</th>
              <th className="text-left py-2">AIRCRAFT</th>
              <th className="text-left py-2">SCORE</th>
              <th className="text-left py-2">SPEED</th>
              <th className="text-left py-2">RANGE</th>
              <th className="text-left py-2">RADAR</th>
              <th className="text-left py-2">STEALTH</th>
              <th className="text-left py-2">COST</th>
              <th className="text-left py-2">REMOVE</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((aircraft, index) => (
              <tr key={aircraft.id} className="border-b border-dashed border-[#0f0]/30 last:border-0">
                <td className="py-2">#{index + 1}</td>
                <td className="py-2 pr-4">{aircraft.name}</td>
                <td className="py-2 text-[#0f0] font-bold">{aircraft.score}</td>
                <td className="py-2">{formatMetric(aircraft.topSpeedKmh, 'km/h')}</td>
                <td className="py-2">{formatMetric(aircraft.rangeKm, 'km')}</td>
                <td className="py-2">{formatMetric(aircraft.radarRangeKm, 'km')}</td>
                <td className="py-2">{formatMetric(aircraft.stealthScore, '/10')}</td>
                <td className="py-2">{formatMetric(aircraft.unitCostMUsd, 'M USD')}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(aircraft.id)}
                    className="border border-[#ff003c] text-[#ff003c] px-2 py-1 hover:bg-[#ff003c] hover:text-black transition-all hover:shadow-[0_0_8px_#ff003c]"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-pixel text-base text-[#0f0] mb-3">METRIC_DEEP_DIVE</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ANALYZE_METRICS.map((metric) => {
            const ordered = [...compareAircraft].sort(
              (a, b) => normalizedMetric(b, metric, activeMetricStats) - normalizedMetric(a, metric, activeMetricStats)
            )
            const lead = ordered[0]

            return (
              <article key={metric.key} className="border border-[#0f0] bg-[#001100] p-4">
                <header className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-pixel text-sm text-[#0f0]">{metric.label}</h3>
                    <p className="text-xs text-[#0f0]/60">LEAD: {lead?.name || 'N/A'}</p>
                  </div>
                  <span className="text-xs text-[#0f0]/70">{lead ? formatMetric(lead[metric.key], metric.unit) : 'NaN'}</span>
                </header>

                <div className="space-y-2">
                  {ordered.map((aircraft, index) => {
                    const normalized = normalizedMetric(aircraft, metric, activeMetricStats)
                    return (
                      <div key={aircraft.id}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span>
                            {index + 1}. {aircraft.name}
                          </span>
                          <span>{formatMetric(aircraft[metric.key], metric.unit)}</span>
                        </div>
                        <div className="h-2 border border-[#0f0] bg-black mt-1">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.max(6, normalized * 100)}%`,
                              backgroundColor: metric.color
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CatalogPage({
  aircraft,
  summaries,
  resolveModel,
  compareIds,
  toggleCompare,
  compareAircraft,
  clearCompare,
  metricStats
}) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [countryFilter, setCountryFilter] = useState('All')
  const [generationFilter, setGenerationFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [comparePanelMinimized, setComparePanelMinimized] = useState(false)

  const roleOptions = useMemo(() => ['All', ...new Set(aircraft.map((item) => item.role))], [aircraft])
  const countryOptions = useMemo(() => ['All', ...new Set(aircraft.map((item) => item.country))], [aircraft])
  const generationOptions = useMemo(() => ['All', ...new Set(aircraft.map((item) => item.generation))], [aircraft])

  const filtered = useMemo(() => {
    const list = aircraft
      .filter((item) => {
        if (!query.trim()) return true
        const text = `${item.name} ${item.country} ${item.role} ${item.generation} ${item.manufacturer}`.toLowerCase()
        return text.includes(query.trim().toLowerCase())
      })
      .filter((item) => (roleFilter === 'All' ? true : item.role === roleFilter))
      .filter((item) => (countryFilter === 'All' ? true : item.country === countryFilter))
      .filter((item) => (generationFilter === 'All' ? true : item.generation === generationFilter))

    if (sortBy === 'speed') {
      list.sort((a, b) => b.topSpeedKmh - a.topSpeedKmh)
    } else if (sortBy === 'range') {
      list.sort((a, b) => b.rangeKm - a.rangeKm)
    } else if (sortBy === 'combatRadius') {
      list.sort((a, b) => b.combatRadiusKm - a.combatRadiusKm)
    } else if (sortBy === 'ceiling') {
      list.sort((a, b) => b.serviceCeilingM - a.serviceCeilingM)
    } else if (sortBy === 'stealth') {
      list.sort((a, b) => b.stealthScore - a.stealthScore)
    } else if (sortBy === 'cost') {
      list.sort((a, b) => a.unitCostMUsd - b.unitCostMUsd)
    } else if (sortBy === 'firstFlight') {
      list.sort((a, b) => b.firstFlight - a.firstFlight)
    } else if (sortBy === 'introduced') {
      list.sort((a, b) => b.introduced - a.introduced)
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }

    return list
  }, [aircraft, countryFilter, generationFilter, query, roleFilter, sortBy])

  const activeMetricStats = useMemo(() => metricStats || buildMetricStats(aircraft), [aircraft, metricStats])
  const compareScoreboard = useMemo(
    () => scoreboardFor(compareAircraft, activeMetricStats),
    [activeMetricStats, compareAircraft]
  )

  const compareScoreById = useMemo(() => {
    return new Map(compareScoreboard.map((item) => [item.id, item.score]))
  }, [compareScoreboard])

  const compareRankById = useMemo(() => {
    return new Map(compareScoreboard.map((item, index) => [item.id, index + 1]))
  }, [compareScoreboard])

  const quickLeads = useMemo(() => {
    if (compareAircraft.length === 0) return []

    return [
      { label: 'FASTEST', metric: METRIC_BY_KEY.topSpeedKmh },
      { label: 'RANGE_KING', metric: METRIC_BY_KEY.rangeKm },
      { label: 'STEALTH_LEAD', metric: METRIC_BY_KEY.stealthScore },
      { label: 'CHEAPEST', metric: METRIC_BY_KEY.unitCostMUsd }
    ].map((entry) => {
      const lead = metricLeader(compareAircraft, entry.metric, activeMetricStats)
      return {
        ...entry,
        lead,
        value: lead ? formatMetric(lead[entry.metric.key], entry.metric.unit) : 'NaN'
      }
    })
  }, [activeMetricStats, compareAircraft])

  const compareDockPadding =
    compareAircraft.length === 0 ? '3rem' : comparePanelMinimized ? '6.5rem' : 'min(30rem, 60vh)'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono" style={{ paddingBottom: compareDockPadding }}>
      <header className="mb-10 terminal-panel p-6 border-2 border-[#0f0] shadow-[0_0_15px_#0f0]">
        <h1 className="font-pixel text-3xl md:text-5xl font-bold text-[#0f0] mb-4 tracking-tight glitch-text" data-text="AIRCRAFT DATABASE">
          AIRCRAFT DATABASE
        </h1>
        <p className="text-[#0f0]/70 max-w-3xl mb-8 text-sm">
          Browse and compare fighter aircraft from around the world. Select up to {ANALYZE_LIMIT} aircraft to run a detailed comparison.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-dashed border-[#0f0] bg-[#001100]">
          <div className="relative md:col-span-2">
            <span className="absolute left-2 top-2.5 text-[#0f0] font-bold">&gt;</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH_QUERY_"
              className="w-full bg-black border border-[#0f0] pl-8 pr-4 py-2 text-[#0f0] outline-none transition-all placeholder:text-[#0f0]/40 uppercase focus:bg-[#002200]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="w-full bg-black border border-[#0f0] px-4 py-2 text-[#0f0] outline-none appearance-none uppercase focus:bg-[#002200]"
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? '* ALL_ROLES *' : `[ ${option} ]`}
              </option>
            ))}
          </select>

          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value)}
            className="w-full bg-black border border-[#0f0] px-4 py-2 text-[#0f0] outline-none appearance-none uppercase focus:bg-[#002200]"
          >
            {countryOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? '* ALL_ORIGINS *' : `[ ${option} ]`}
              </option>
            ))}
          </select>

          <select
            value={generationFilter}
            onChange={(event) => setGenerationFilter(event.target.value)}
            className="w-full bg-black border border-[#0f0] px-4 py-2 text-[#0f0] outline-none appearance-none uppercase focus:bg-[#002200]"
          >
            {generationOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? '* ALL_GENS *' : `[ ${option} ]`}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full bg-black border border-[#0f0] px-4 py-2 text-[#0f0] outline-none appearance-none uppercase focus:bg-[#002200]"
          >
            <option value="name">SORT: ALPHANUMERIC</option>
            <option value="speed">SORT: TOP_SPEED</option>
            <option value="range">SORT: FERRY_RANGE</option>
            <option value="combatRadius">SORT: COMBAT_RADIUS</option>
            <option value="ceiling">SORT: SERVICE_CEILING</option>
            <option value="stealth">SORT: STEALTH_SCORE</option>
            <option value="cost">SORT: COST_ASC</option>
            <option value="firstFlight">SORT: FIRST_FLIGHT_DESC</option>
            <option value="introduced">SORT: INTRODUCED_DESC</option>
          </select>
        </div>

        <div className="mt-2 text-xs text-[#0f0]/60">
          {filtered.length} aircraft found
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((item) => {
          const model = resolveModel(item)
          const summary = summaries[item.wikiTitle]
          const inCompare = compareIds.includes(item.id)
          const compareLocked = compareIds.length >= ANALYZE_LIMIT && !inCompare

          return (
            <article
              key={item.id}
              className="group bg-black border-2 border-[#0f0] hover:shadow-[0_0_20px_#0f0] flex flex-col h-full transition-shadow duration-75 relative"
            >
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#0f0] -translate-x-[2px] -translate-y-[2px]" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#0f0] translate-x-[2px] -translate-y-[2px]" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#0f0] -translate-x-[2px] translate-y-[2px]" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#0f0] translate-x-[2px] translate-y-[2px]" />

              <Link to={`/aircraft/${item.id}`} className="block relative h-40 overflow-hidden bg-[#001100] border-b-2 border-[#0f0] cursor-crosshair">
                {summary?.image ? (
                  <img
                    src={summary.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-60 grayscale contrast-150 mix-blend-screen group-hover:scale-110 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#ff003c] font-pixel text-sm uppercase glitch-text" data-text="IMG_NULL">
                    IMG_NULL
                  </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none" />

                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="bg-black text-[#0f0] text-[10px] px-1.5 py-0.5 border border-[#0f0] font-bold">[{item.country}]</span>
                </div>

                {model && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-[#0f0] text-black text-[10px] px-1.5 py-0.5 font-bold animate-pulse">3D_GEO</span>
                  </div>
                )}
              </Link>

              <div className="p-4 flex flex-col flex-grow relative">
                <div className="mb-3 border-b border-dashed border-[#0f0] pb-2">
                  <h2 className="font-pixel text-base sm:text-[15px] leading-snug font-bold text-[#0f0] group-hover:bg-[#0f0] group-hover:text-black transition-colors inline-block">
                    {item.name}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-[#0f0]/80 tracking-wide uppercase mt-1">
                    {item.role} // {item.generation}
                  </p>
                </div>

                <div className="mb-4 text-xs font-mono bg-[#002200] p-2 border border-[#0f0]/30">
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#0f0]/60">V_MAX</span>
                    <span className="text-[#0f0] font-bold">{formatMetric(item.topSpeedKmh, 'km/h')}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#0f0]/60">R_MAX</span>
                    <span className="text-[#0f0] font-bold">{formatMetric(item.rangeKm, 'km')}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#0f0]/60">RDR</span>
                    <span className="text-[#0f0] font-bold">{formatMetric(item.radarRangeKm, 'km')}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#0f0]/60">STLH</span>
                    <span className="text-[#0f0] font-bold">{formatMetric(item.stealthScore, '/10')}</span>
                  </div>
                </div>

                <p className="text-xs text-[#0f0]/70 line-clamp-3 mb-6 flex-grow overflow-hidden">
                  &gt; {item.description}
                </p>

                <div className="flex gap-2 mt-auto pt-4 border-t-2 border-double border-[#0f0]">
                  <Link
                    to={`/aircraft/${item.id}`}
                    className="flex-1 text-center bg-black text-[#0f0] border border-[#0f0] py-2 text-xs font-bold uppercase glitch-hover cursor-crosshair"
                  >
                    [ ACCESS_RECORD ]
                  </Link>
                  <button
                    type="button"
                    disabled={compareLocked}
                    onClick={() => toggleCompare(item.id)}
                    className={`px-3 py-2 text-xs font-bold uppercase border cursor-crosshair transition-all duration-100 ${
                      inCompare
                        ? 'bg-[#220000] text-[#ff003c] border-[#ff003c] hover:bg-[#ff003c] hover:text-black hover:shadow-[0_0_10px_#ff003c] hover:-translate-y-0.5'
                        : 'bg-black text-[#0f0] border-[#0f0] glitch-hover disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-black disabled:text-[#0f0]'
                    }`}
                  >
                    {inCompare ? '[ - REMOVE ]' : '[ + ANALYZE ]'}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div
        className={`fixed bottom-0 left-0 w-full z-40 transition-transform duration-200 ${
          compareAircraft.length > 0 ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-black/95 backdrop-blur-sm border-t-4 border-double border-[#0f0] px-4 pt-3 pb-4 md:px-6 shadow-[0_-10px_20px_rgba(0,255,0,0.2)]">
          <div className="max-w-7xl mx-auto font-mono">
            <header className="flex flex-wrap justify-between items-center gap-2 border-b border-dashed border-[#0f0] pb-2">
              <h2 className="font-pixel text-lg font-bold text-[#0f0] flex items-center gap-2">
                <span className="w-3 h-3 bg-[#ff003c] animate-pulse" />
                ACTIVE_ANALYSIS ({compareAircraft.length}/{ANALYZE_LIMIT})
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setComparePanelMinimized((value) => !value)}
                  className="text-xs text-[#0f0] border border-[#0f0] px-2 py-1 uppercase hover:bg-[#0f0] hover:text-black transition-colors"
                >
                  {comparePanelMinimized ? '[ RAISE_PANEL ]' : '[ LOWER_PANEL ]'}
                </button>
                <Link to="/analyze" className="text-xs text-[#0f0] border border-[#0f0] px-2 py-1 uppercase glitch-hover">
                  [ OPEN_SUITE ]
                </Link>
                <button
                  type="button"
                  onClick={clearCompare}
                  className="text-xs text-[#ff003c] border border-[#ff003c] px-2 py-1 uppercase hover:bg-[#ff003c] hover:text-black transition-colors"
                >
                  [ PURGE_ALL ]
                </button>
              </div>
            </header>

            <div
              className={`overflow-hidden transition-all duration-200 ${
                comparePanelMinimized ? 'max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-[26rem] opacity-100 mt-4'
              }`}
            >
              <div className="max-h-[24rem] overflow-y-auto pr-1">
                {quickLeads.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 text-[11px]">
                    {quickLeads.map((entry) => (
                      <div key={entry.label} className="border border-[#0f0]/40 bg-[#001100] px-2 py-1">
                        <span className="text-[#0f0]/70">{entry.label}: </span>
                        <span>{entry.lead?.name || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {compareAircraft.map((item) => {
                    const speedNorm = normalizedMetric(item, METRIC_BY_KEY.topSpeedKmh, activeMetricStats)
                    const rangeNorm = normalizedMetric(item, METRIC_BY_KEY.rangeKm, activeMetricStats)
                    const stealthNorm = normalizedMetric(item, METRIC_BY_KEY.stealthScore, activeMetricStats)
                    const costNorm = normalizedMetric(item, METRIC_BY_KEY.unitCostMUsd, activeMetricStats)

                    return (
                      <article key={item.id} className="bg-[#001100] border-2 border-[#0f0] p-4 relative group hover:bg-[#002200] transition-colors">
                        <button
                          type="button"
                          onClick={() => toggleCompare(item.id)}
                          className="absolute -top-3 -right-3 bg-black text-[#ff003c] border border-[#ff003c] w-6 h-6 flex items-center justify-center font-bold hover:bg-[#ff003c] hover:text-black transition-all hover:scale-110 hover:shadow-[0_0_8px_#ff003c] z-10"
                        >
                          X
                        </button>

                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-pixel text-xs text-[#0f0] truncate bg-[#0f0] text-black inline-block p-1">{item.name}</h3>
                          <span className="text-[10px] border border-[#0f0] px-2 py-0.5">#{compareRankById.get(item.id) || '-'}</span>
                        </div>

                        <p className="text-[10px] text-[#0f0]/60 mb-2 uppercase border-b border-[#0f0]/30 pb-1">ORIGIN: {item.country}</p>
                        <p className="text-xs mb-3">
                          SCORE: <span className="text-[#0f0] font-bold">{compareScoreById.get(item.id) ?? 0}</span>
                        </p>

                        <div className="space-y-2">
                          {[
                            { label: 'SPD', value: formatMetric(item.topSpeedKmh, 'km/h'), width: speedNorm, color: '#00ff00' },
                            { label: 'RNG', value: formatMetric(item.rangeKm, 'km'), width: rangeNorm, color: '#00ffff' },
                            { label: 'STLH', value: formatMetric(item.stealthScore, '/10'), width: stealthNorm, color: '#88ff88' },
                            { label: 'COST_EFF', value: formatMetric(item.unitCostMUsd, 'M USD'), width: costNorm, color: '#ff6680' }
                          ].map((metric) => (
                            <div key={metric.label}>
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-[#0f0]/60">{metric.label}</span>
                                <span className="text-[#0f0]">{metric.value}</span>
                              </div>
                              <div className="h-2 w-full bg-black border border-[#0f0]">
                                <div
                                  className="h-full"
                                  style={{ width: `${Math.max(8, metric.width * 100)}%`, backgroundColor: metric.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    )
                  })}

                  {Array.from({ length: ANALYZE_LIMIT - compareAircraft.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="hidden xl:flex border-2 border-dashed border-[#0f0]/30 bg-[#000500] items-center justify-center text-[#0f0]/30 text-xs font-mono h-full min-h-[170px]"
                    >
                      [ AWAITING_DATA ]
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AircraftProfileRoute({ aircraftById, summaries, resolveModel }) {
  const { aircraftId } = useParams()
  const aircraft = aircraftById.get(aircraftId)

  if (!aircraft) {
    return <Navigate to="/" replace />
  }

  return <AircraftProfile aircraft={aircraft} model={resolveModel(aircraft)} summary={summaries[aircraft.wikiTitle]} />
}

function AppContent() {
  const [compareIds, setCompareIds] = useState([])

  const metricStats = useMemo(() => buildMetricStats(aircraftData), [])
  const aircraftById = useMemo(() => new Map(aircraftData.map((item) => [item.id, item])), [])
  const modelsById = useMemo(() => new Map(modelsManifest.map((item) => [item.id, item])), [])
  const modelsByAircraftId = useMemo(() => new Map(modelsManifest.map((item) => [item.aircraftId, item])), [])

  const resolveModel = useCallback(
    (aircraft) => {
      if (!aircraft) return null
      if (aircraft.modelId && modelsById.has(aircraft.modelId)) {
        return modelsById.get(aircraft.modelId)
      }
      return modelsByAircraftId.get(aircraft.id) || null
    },
    [modelsByAircraftId, modelsById]
  )

  const featuredModelPaths = useMemo(() => {
    return aircraftData
      .filter((item) => item.featured)
      .map((item) => resolveModel(item)?.path)
      .filter(Boolean)
  }, [resolveModel])

  useEffect(() => {
    featuredModelPaths.forEach((path) => useGLTF.preload(path))
  }, [featuredModelPaths])

  const wikiTitles = useMemo(() => aircraftData.map((item) => item.wikiTitle), [])
  const summaries = useWikiSummaries(wikiTitles)

  const toggleCompare = useCallback((id) => {
    setCompareIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }
      if (current.length >= ANALYZE_LIMIT) {
        return current
      }
      return [...current, id]
    })
  }, [])

  const clearCompare = useCallback(() => {
    setCompareIds([])
  }, [])

  const compareAircraft = useMemo(() => {
    return compareIds.map((id) => aircraftById.get(id)).filter(Boolean)
  }, [aircraftById, compareIds])

  return (
    <div className="flex flex-col min-h-screen crt">
      <header className="sticky top-0 z-50 bg-black/90 border-b-2 border-[#0f0] shadow-[0_0_15px_rgba(0,255,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between font-mono">
          <Link to="/" className="flex items-center gap-3 group glitch-hover px-2 py-1">
            <span className="font-pixel font-bold text-lg tracking-wider text-[#0f0] group-hover:text-black">
              sys.JETATLAS<span className="animate-pulse">_</span>
            </span>
          </Link>

          <nav className="flex gap-4 items-center text-xs">
            <Link to="/analyze" className="text-[#0f0] border border-[#0f0] px-2 py-1 glitch-hover uppercase">
              Analyze ({compareIds.length}/{ANALYZE_LIMIT})
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow flex flex-col relative z-20">
        <PageTransition>
          <Routes>
            <Route
              path="/"
              element={
                <CatalogPage
                  aircraft={aircraftData}
                  summaries={summaries}
                  resolveModel={resolveModel}
                  compareIds={compareIds}
                  toggleCompare={toggleCompare}
                  compareAircraft={compareAircraft}
                  clearCompare={clearCompare}
                  metricStats={metricStats}
                />
              }
            />
            <Route
              path="/aircraft/:aircraftId"
              element={<AircraftProfileRoute aircraftById={aircraftById} summaries={summaries} resolveModel={resolveModel} />}
            />
            <Route
              path="/analyze"
              element={
                <AnalyzePage
                  compareAircraft={compareAircraft}
                  allAircraft={aircraftData}
                  compareIds={compareIds}
                  metricStats={metricStats}
                  toggleCompare={toggleCompare}
                  clearCompare={clearCompare}
                />
              }
            />
          </Routes>
        </PageTransition>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
