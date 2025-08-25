// components/DesignStyles.tsx
"use client"

/**
 * Pure styling injector (scoped under [data-mentor-ui]):
 * - Colors, glass cards, gradients, fonts, animations to match front_end.txt
 * - No wording/logic changes
 */
export default function DesignStyles() {
  return (
    <style jsx global>{`
      /* -------- Font baseline to match front_end.txt -------- */
      * { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }

      /* -------- Color tokens pulled from your front_end.txt -------- */
      [data-mentor-ui] {
        --soft-purple: #9B7EDE;
        --earth-green: #7A8471;
        --text-900: #111827;
        --text-700: #374151;
        --text-600: #4B5563;
        --text-500: #6B7280;
        --card-border: rgba(255,255,255,.2);
        --card-bg: rgba(255,255,255,.8);
      }

      /* Subtle page background (keep it minimal & modern) */
      [data-mentor-ui] {
        background-attachment: fixed;
        background-image:
          radial-gradient(900px 480px at 90% -10%, rgba(155,126,222,.08), transparent 60%),
          radial-gradient(900px 520px at 10% 110%, rgba(122,132,113,.06), transparent 60%);
      }

      /* Decorative helpers mirrored from front_end.txt */
      [data-mentor-ui] .gradient-text {
        background: linear-gradient(135deg, var(--soft-purple), var(--earth-green));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      [data-mentor-ui] .circle-bg {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      }

      /* Glass card baseline exactly like your front_end.txt */
      [data-mentor-ui] .dashboard-card {
        background: var(--card-bg);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid var(--card-border);
      }

      /* Report header style (thin, centered) */
      [data-mentor-ui] .report-title {
        font-size: clamp(2rem, 2.6vw + 1rem, 3.25rem);
        font-weight: 300;
        color: var(--text-600);
        line-height: 1.15;
        text-align: center;
        margin: 0;
      }
      [data-mentor-ui] .report-subtitle {
        font-size: .95rem;
        color: #9CA3AF;
        text-align: center;
        margin-top: .35rem;
      }

      /* Section open/close interaction (smooth) */
      [data-mentor-ui] .sect-btn { padding: 1rem 1.25rem; }
      [data-mentor-ui] .sect-panel {
        overflow: hidden;
        transition: max-height .45s cubic-bezier(.22,1,.36,1), opacity .35s ease;
      }
      [data-mentor-ui] .sect-panel[data-open="true"] { opacity: 1; }
      [data-mentor-ui] .sect-panel[data-open="false"] { opacity: 0; max-height: 0 !important; }
      [data-mentor-ui] .sect-btn .plus { transition: transform .25s ease; }
      [data-mentor-ui] .sect-btn[aria-expanded="true"] .plus { transform: rotate(45deg); }

      /* Animations from front_end.txt */
      @keyframes fadeIn { from { opacity:0; transform: translateY(20px);} to { opacity:1; transform: translateY(0);} }
      @keyframes slideUp { from { opacity:0; transform: translateY(30px);} to { opacity:1; transform: translateY(0);} }
      @keyframes pulseGentle { 0%,100% { transform: scale(1);} 50% { transform: scale(1.05);} }

      [data-mentor-ui] .fade-in { animation: fadeIn .8s ease-in-out; }
      [data-mentor-ui] .slide-up { animation: slideUp .6s ease-out; }
      [data-mentor-ui] .pulse-gentle { animation: pulseGentle 2s infinite; }

      /* Hover micro-interaction for rounded-xl, etc. */
      [data-mentor-ui] a.rounded-xl, [data-mentor-ui] button.rounded-xl, [data-mentor-ui] .rounded-xl.px-5, [data-mentor-ui] .rounded-xl.px-6 {
        transition: transform .2s ease, box-shadow .2s ease;
      }
      [data-mentor-ui] a.rounded-xl:hover, [data-mentor-ui] button.rounded-xl:hover, [data-mentor-ui] .rounded-xl.px-5:hover, [data-mentor-ui] .rounded-xl.px-6:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(0,0,0,.06);
      }

      @media (prefers-reduced-motion: reduce) {
        [data-mentor-ui] .fade-in,
        [data-mentor-ui] .slide-up,
        [data-mentor-ui] .pulse-gentle { animation: none !important; }
      }

      /* === Palette from front_end.txt (scoped) === */
[data-mentor-ui]{
  --soft-purple: #9B7EDE;
  --earth-brown: #8B7355;
  --earth-green: #7A8471;

  --text-900:#111827; /* near-black */
  --text-700:#374151; /* body */
  --text-600:#4B5563; /* headers/subtle */
  --muted:#9CA3AF;

  --card-bg: rgba(255,255,255,.82);
  --card-border: rgba(255,255,255,.22);
}

/* Subtle radial page background like your landing */
[data-mentor-ui]{
  background-attachment: fixed;
  background-image:
    radial-gradient(1200px 600px at 90% -10%, rgba(155,126,222,.08), transparent 60%),
    radial-gradient(1000px 600px at 10% 110%, rgba(122,132,113,.06), transparent 60%);
}

/* Glass cards */
[data-mentor-ui] .dashboard-card{
  background: var(--card-bg);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid var(--card-border);
}

/* Headline (thin grey) */
[data-mentor-ui] .report-title{
  color: var(--text-600);
}

/* Section header + body color system */
[data-mentor-ui] .sect-btn span:first-child{ color: var(--text-900); }
[data-mentor-ui] .sect-panel{ color: var(--text-700); }

/* Gradient text helper from your FE ref */
[data-mentor-ui] .gradient-text{
  background: linear-gradient(135deg, var(--soft-purple), var(--earth-green));
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
}

/* Roadblocks cards use purple accent left border */
[data-mentor-ui] .rb-item{
  background:#fff;
  border:1px solid rgba(17,24,39,.06);
  border-left:4px solid var(--soft-purple);
  border-radius: 12px;
}
[data-mentor-ui] .rb-issue{ color: var(--text-900); }
[data-mentor-ui] .rb-solution{ color: var(--text-700); }

/* Micro-interactions (already aligned with your FE) */
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseGentle{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
[data-mentor-ui] .fade-in{animation:fadeIn .8s ease-in-out}
[data-mentor-ui] .slide-up{animation:slideUp .6s ease-out}
[data-mentor-ui] .pulse-gentle{animation:pulseGentle 2s infinite}

@media (prefers-reduced-motion: reduce){
  [data-mentor-ui] .fade-in, [data-mentor-ui] .slide-up, [data-mentor-ui] .pulse-gentle{animation:none!important}
}


/* Global report background */
[data-mentor-ui] body,
[data-mentor-ui] .report-page {
  background-color: #f9fafb; /* light gray background like example */
  min-height: 100vh;
}

/* Section cards */
[data-mentor-ui] section.dashboard-card {
  background: #fff; /* solid white */
  border-radius: 1rem; /* rounded corners */
  border: 1px solid rgba(0, 0, 0, 0.05); /* subtle border */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04); /* gentle shadow */
  padding: 1.5rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Hover lift for cards */
[data-mentor-ui] section.dashboard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

/* Report title/subtitle styling for contrast */
[data-mentor-ui] .report-title {
  color: #111827; /* darker for better readability */
  text-align: center;
  font-size: 2rem;
  font-weight: 500;
}
[data-mentor-ui] .report-subtitle {
  color: #6b7280; /* muted gray */
  text-align: center;
  margin-top: 0.25rem;
}
    `}</style>
  )
}