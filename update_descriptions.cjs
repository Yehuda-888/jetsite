const fs = require('fs');
const path = './src/data/aircraft.json';

const descriptions = {
  "f-22": "The paramount U.S. stealth air superiority fighter. Engineered to dominate contested airspace with sustained supercruise and unmatched agility.",
  "f-35a": "A highly advanced stealth multirole fighter. Built for networked warfare, integrating unmatched sensor fusion with precise global strikes.",
  "rafale-c": "France's premier omnirole fighter. Features a highly agile delta-canard design, capable of rapidly switching between air dominance and strike.",
  "typhoon": "A twin-engine, canard-delta wing multirole fighter. Renowned for exceptional high-altitude speed, agility, and powerful BVR capabilities.",
  "fa-18e": "The backbone of U.S. naval aviation. A carrier-capable, twin-engine strike fighter delivering robust fleet defense and versatile firepower.",
  "gripen-c": "A highly efficient Swedish lightweight fighter. Optimized for dispersed operations, quick turnaround times, and formidable tactical flexibility.",
  "su-57": "Russia's advanced fifth-generation fighter. Blends extreme supermaneuverability with low observability to engage high-value aerial targets.",
  "kf-21": "South Korea's next-generation multirole fighter. Bridges advanced fourth-generation reliability with an evolving, low-observable stealth design.",
  "f-15c": "An undefeated U.S. air dominance platform. Combines a massive combat radius with tremendous thrust-to-weight performance for aerial supremacy.",
  "f-15ex": "The ultimate evolution of the Eagle lineage. Features an expanded weapons payload, digital fly-by-wire, and advanced electronic warfare tools.",
  "f-16c": "A legendary, lightweight multirole fighter. Proven in global combat, it delivers exceptional dogfighting maneuverability and precision strikes.",
  "f-14d": "The iconic variable-sweep wing naval interceptor. Designed to protect carrier battle groups with its formidable long-range Phoenix missiles.",
  "mig-29": "A compact, twin-engine Soviet front-line fighter. Built for rapid scramble response, outstanding climb rates, and lethal close-range combat.",
  "su-35s": "A heavily upgraded Flanker derivative. Emphasizes sheer kinematic performance, extraordinary range, and advanced thrust-vectoring maneuverability.",
  "su-27": "The original Soviet heavy air superiority fighter. Combines massive internal fuel capacity with incredible aerodynamic agility for deep strike.",
  "mig-31bm": "An extreme-speed, high-altitude interceptor. Designed for vast airspace denial, capable of tracking and engaging targets at Mach 2.83 speeds.",
  "j-20": "China's premier stealth air superiority platform. Focuses on long-range supersonic engagement, advanced sensor networking, and deep strikes.",
  "j-10c": "A highly capable Chinese canard-delta multirole fighter. Upgraded with modern AESA radar and advanced avionics for comprehensive air missions.",
  "j-35": "China's emerging carrier-capable stealth fighter. Designed to project fifth-generation naval airpower with advanced networked sensor systems.",
  "mirage-2000-5": "A fast-climbing French delta-wing interceptor. Modernized for versatile multirole missions while retaining its classic, highly agile profile.",
  "tejas-mk1a": "India's indigenous light combat aircraft. A compact, highly agile platform featuring modern digital flight controls and an advanced AESA radar.",
  "jf-17-block3": "A cost-effective, multirole tactical fighter. Upgraded with a cutting-edge AESA radar and helmet-mounted cueing for versatile air combat.",
  "f-2": "Japan's enlarged F-16 derivative. Specially optimized for anti-ship strike missions, featuring advanced composite wings and domestic sensors.",
  "kaan": "Turkey's ambitious fifth-generation fighter program. Designed to ensure domestic airpower autonomy with low observability and sensor fusion."
};

let data = JSON.parse(fs.readFileSync(path, 'utf8'));

data = data.map(item => {
  if (descriptions[item.id]) {
    item.description = descriptions[item.id];
  }
  return item;
});

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('Descriptions updated successfully.');