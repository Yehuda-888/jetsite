import { Suspense, lazy, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const ModelViewer = lazy(() => import('./ModelViewer'))

function formatValue(value, unit) {
  if (typeof value !== 'number') return 'NULL'
  const amount = new Intl.NumberFormat('en-US').format(value)
  return `${amount} ${unit}`
}

function videoEmbed(query) {
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`
}

function videoSearch(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

export default function AircraftProfile({ aircraft, model, summary }) {
  const [tab, setTab] = useState('systems')

  const summaryText = summary?.extract || aircraft.description

  const tabs = useMemo(
    () => [
      { id: 'systems', label: '[SYS.DAT]' },
      { id: 'timeline', label: '[LOG.TXT]' },
      { id: 'operators', label: '[USR.LST]' },
      { id: 'sources', label: '[SRC.BIN]' },
      { id: 'video', label: '[VID.MP4]' }
    ],
    []
  )

  return (
    <article className="min-h-[calc(100vh-4rem)] bg-black text-[#0f0] flex flex-col lg:flex-row font-mono">
      
      {/* Left Column: 3D Wireframe Canvas */}
      <section className="w-full lg:w-1/2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex flex-col border-r-2 border-dashed border-[#0f0] relative bg-[#020502]">
        
        {/* Navigation & Header Overlays */}
        <div className="absolute top-0 left-0 w-full p-6 z-30 pointer-events-none flex flex-col gap-4">
          <div className="pointer-events-auto">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm font-bold bg-black text-[#0f0] border border-[#0f0] px-4 py-2 glitch-hover uppercase shadow-[0_0_10px_#0f0]"
            >
              &lt; RETURN_TO_DB
            </Link>
          </div>

          <div>
            <h1 className="font-pixel text-2xl md:text-3xl font-bold text-[#0f0] uppercase tracking-wider drop-shadow-[0_0_10px_#0f0] glitch-text" data-text={aircraft.name}>
              {aircraft.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3 pointer-events-auto text-xs font-bold">
              <span className="bg-[#0f0] text-black px-2 py-1 uppercase">
                ORIGIN: {aircraft.country}
              </span>
              <span className="border border-[#0f0] px-2 py-1 uppercase">
                CLASS: {aircraft.role}
              </span>
              <span className="border border-dashed border-[#ff003c] text-[#ff003c] px-2 py-1 uppercase shadow-[0_0_5px_#ff003c]">
                GEN: {aircraft.generation}
              </span>
            </div>
          </div>
        </div>

        {/* 3D Matrix Viewer Container */}
        <div className="flex-grow w-full h-[50vh] lg:h-full relative overflow-hidden flex items-center justify-center p-4">
          <Suspense 
            fallback={
              <div className="flex flex-col items-center justify-center gap-4 text-[#0f0] font-mono border-2 border-[#0f0] p-6 shadow-[0_0_15px_#0f0_inset]">
                <span className="animate-pulse">&gt; UPLOADING_MATRIX_GEOMETRY...</span>
              </div>
            }
          >
            <ModelViewer model={model} />
          </Suspense>
        </div>
      </section>

      {/* Right Column: Terminal Data */}
      <section className="w-full lg:w-1/2 p-6 md:p-10 overflow-y-auto bg-black terminal-panel">
        <div className="max-w-3xl mx-auto space-y-12 pb-20">
          
          {/* Tech Specs Block */}
          <div>
            <h2 className="font-pixel text-lg text-[#0f0] mb-6 flex items-center gap-3 border-b-2 border-[#0f0] pb-2 uppercase">
              &gt;&gt; _SPECS_OVERRIDE
            </h2>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-sm">
              {[
                { label: 'VELOCITY_MAX', value: formatValue(aircraft.topSpeedKmh, 'km/h') },
                { label: 'RANGE_FERRY', value: formatValue(aircraft.rangeKm, 'km') },
                { label: 'RANGE_COMBAT', value: formatValue(aircraft.combatRadiusKm, 'km') },
                { label: 'ALT_CEIL', value: formatValue(aircraft.serviceCeilingM, 'm') },
                { label: 'THRUST_TOTAL', value: formatValue(aircraft.thrustKn, 'kN') },
                { label: 'CLIMB_RATE', value: formatValue(aircraft.climbRateMs, 'm/s') },
                { label: 'PAYLOAD_MAX', value: formatValue(aircraft.payloadKg, 'kg') },
                { label: 'HARDPOINTS', value: aircraft.hardpoints ?? 'NULL' },
                { label: 'RADAR_RANGE', value: formatValue(aircraft.radarRangeKm, 'km') },
                { label: 'STEALTH_IDX', value: formatValue(aircraft.stealthScore, '/10') },
                { label: 'G_LIMIT', value: formatValue(aircraft.gLimit, 'g') },
                { label: 'UNIT_COST', value: formatValue(aircraft.unitCostMUsd, 'M USD') },
                { label: 'MTOW', value: formatValue(aircraft.maxTakeoffWeightKg, 'kg') },
                { label: 'EMPTY_WEIGHT', value: formatValue(aircraft.emptyWeightKg, 'kg') },
                { label: 'LENGTH', value: formatValue(aircraft.lengthM, 'm') },
                { label: 'WINGSPAN', value: formatValue(aircraft.wingspanM, 'm') },
                { label: 'INIT_FLIGHT', value: aircraft.firstFlight },
                { label: 'INTRODUCED', value: aircraft.introduced },
                { label: 'MANUFAC', value: aircraft.manufacturer },
                { label: 'FUNC_ROLE', value: aircraft.role },
                { label: 'TECH_GEN', value: aircraft.generation }
              ].map((spec, i) => (
                <div key={i} className="flex flex-col border border-dashed border-[#0f0] p-3 hover:bg-[#002200] transition-colors cursor-crosshair">
                  <dt className="text-xs text-[#0f0]/60 uppercase tracking-wider mb-1">{spec.label}:</dt>
                  <dd className="font-bold text-[#0f0]">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Decrypted Intel */}
          <div>
            <h3 className="font-pixel text-lg text-[#0f0] mb-4 border-b-2 border-[#0f0] pb-2 uppercase">&gt;&gt; _DECRYPTED_INTEL</h3>
            <div className="font-mono text-sm leading-relaxed p-4 border border-[#0f0] bg-[#001100] shadow-[inset_0_0_10px_#0f0]">
              <p className="mb-4 text-[#0f0]">{summaryText}</p>
              {summary?.extract && <p className="text-[#0f0]/80 italic">/* LOCAL DB FALLBACK */<br/>{aircraft.description}</p>}
            </div>
          </div>

          {/* Key Directives */}
          {aircraft.facts?.length > 0 && (
            <div>
              <h3 className="font-pixel text-lg text-[#0f0] mb-4 border-b-2 border-[#ff003c] text-[#ff003c] pb-2 uppercase shadow-[0_0_5px_#ff003c]">
                &gt;&gt; _CRITICAL_DATA
              </h3>
              <ul className="space-y-3 font-mono text-sm">
                {aircraft.facts.map((fact, index) => (
                  <li key={index} className="flex gap-3 text-[#ff003c] border border-dashed border-[#ff003c] p-3 bg-[#110000]">
                    <span className="mt-0.5 animate-pulse">[!]</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Terminal Tabs */}
          <div className="pt-6">
            <div className="flex flex-wrap gap-2 mb-6 border-b-4 border-double border-[#0f0] pb-4" role="tablist">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-all border ${
                    tab === item.id 
                      ? 'bg-[#0f0] text-black border-[#0f0] shadow-[0_0_10px_#0f0]' 
                      : 'bg-black text-[#0f0] border-[#0f0] glitch-hover'
                  }`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="min-h-[300px] border border-[#0f0] p-6 bg-[#001100]" role="tabpanel">
              <span className="text-xs mb-4 block">&gt; ACCESSING {tab.toUpperCase()}...</span>

              {tab === 'systems' && (
                <ul className="space-y-4">
                  {[
                    { label: 'CREW_CNT', value: aircraft.crew },
                    { label: 'THRUSTERS', value: aircraft.engines },
                    { label: 'RADAR_SYS', value: aircraft.radar },
                    { label: 'AVIONICS', value: aircraft.avionics },
                    { label: 'AIRFRAME_LEN', value: formatValue(aircraft.lengthM, 'm') },
                    { label: 'WINGSPAN', value: formatValue(aircraft.wingspanM, 'm') },
                    { label: 'WEIGHT_EMPTY', value: formatValue(aircraft.emptyWeightKg, 'kg') },
                    { label: 'WEIGHT_MTOW', value: formatValue(aircraft.maxTakeoffWeightKg, 'kg') }
                  ].map((sys, i) => (
                    <li key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 border-b border-dashed border-[#0f0]/50 pb-4 last:border-0 last:pb-0">
                      <strong className="text-xs uppercase tracking-wider w-28 shrink-0">{sys.label} =</strong>
                      <span className="text-[#0f0]">{sys.value}</span>
                    </li>
                  ))}
                </ul>
              )}

              {tab === 'timeline' && (
                <div className="border-l-2 border-dashed border-[#0f0] ml-3 space-y-6">
                  {aircraft.programMilestones.map((milestone, i) => (
                    <div key={i} className="relative pl-6">
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 bg-[#0f0] shadow-[0_0_10px_#0f0]"></span>
                      <p className="text-sm">{milestone}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'operators' && (
                <div className="flex flex-wrap gap-2">
                  {aircraft.operators.map((operator, i) => (
                    <span key={i} className="bg-black border border-[#0f0] text-[#0f0] px-3 py-1.5 text-xs uppercase hover:bg-[#0f0] hover:text-black transition-colors cursor-crosshair">
                      [{operator}]
                    </span>
                  ))}
                </div>
              )}

              {tab === 'sources' && (
                <ul className="space-y-3">
                  {aircraft.references.map((reference, i) => (
                    <li key={i}>
                      <a 
                        href={reference.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs glitch-hover border border-dashed border-[#0f0] p-2 bg-black inline-block"
                      >
                        &gt;&gt; {reference.label}
                      </a>
                    </li>
                  ))}
                  {summary?.pageUrl && (
                    <li>
                      <a 
                        href={summary.pageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs glitch-hover border border-dashed border-[#0f0] p-2 bg-black inline-block mt-4 text-[#ff003c] border-[#ff003c]"
                      >
                        &gt;&gt; WIKIPEDIA_DUMP_SOURCE
                      </a>
                    </li>
                  )}
                </ul>
              )}

              {tab === 'video' && (
                <div className="flex flex-col gap-4 h-full">
                  <div className="aspect-video w-full overflow-hidden bg-black border-2 border-[#0f0] shadow-[0_0_20px_#0f0]">
                    <iframe
                      className="w-full h-full grayscale contrast-150 sepia mix-blend-screen"
                      title={`${aircraft.name} video briefings`}
                      src={videoEmbed(aircraft.videoQuery)}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <a 
                    href={videoSearch(aircraft.videoQuery)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#0f0] text-black py-2.5 text-xs font-bold uppercase glitch-hover"
                  >
                    &gt;&gt; INITIATE_YOUTUBE_QUERY
                  </a>
                </div>
              )}
              
              <span className="block mt-4 text-xs">EOF_</span>
            </div>
          </div>

        </div>
      </section>
    </article>
  )
}
