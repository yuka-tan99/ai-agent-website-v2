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
        --navH: 56px; /* TopNav height */
        --accent-grape: #7C3AED; /* mild/darker purple that's easy on eyes */
        --soft-purple: #9B7EDE;
        --earth-green: #7A8471;
        --text-900: #111827;
        --text-700: #374151;
        --text-600: #4B5563;
        --text-500: #6B7280;
        --card-border: rgba(255,255,255,.2);
        --card-bg: rgba(255,255,255,.8);
      }

      /* Unified page background to match TopNav */
      [data-mentor-ui] { background-color: #f9fafb; background-image: none !important; }

      /* Decorative helpers mirrored from front_end.txt */
        [data-mentor-ui] .gradient-text {
        background: linear-gradient(135deg, var(--accent-grape), var(--soft-purple));
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

      /* ===== Password modal ===== */
      [data-mentor-ui] .pw-modal { position: fixed; inset: 0; z-index: 100; }
      [data-mentor-ui] .pw-backdrop { position: absolute; inset: 0; background: rgba(17,24,39,.45); backdrop-filter: blur(2px); }
      [data-mentor-ui] .pw-dialog {
        position: relative;
        margin: 12vh auto 0; max-width: 460px;
        background: #fff; border-radius: 18px; overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,.25);
      }
      [data-mentor-ui] .pw-head { display:flex; align-items:center; justify-content:space-between; padding: 14px 18px; background: #f3f4f6; border-bottom: 1px solid rgba(0,0,0,.06); }
      [data-mentor-ui] .pw-head h3 { margin:0; font-size: 1.05rem; color: var(--text-900); font-weight: 600; }
      [data-mentor-ui] .pw-x { font-size: 22px; line-height: 1; background: transparent; border: 0; color: #6b7280; }
      [data-mentor-ui] .pw-body { padding: 16px 18px; }
      [data-mentor-ui] .pw-input {
        width: 100%; height: 44px; border-radius: 9999px; padding: 0 16px; outline: none;
        border: 2px solid color-mix(in srgb, var(--soft-purple) 80%, #bda7ff);
      }
      [data-mentor-ui] .pw-input:focus { box-shadow: 0 0 0 3px color-mix(in oklab, var(--soft-purple) 22%, transparent); }
      [data-mentor-ui] .pw-msg { margin-top: 8px; font-size: .9rem; color: #b91c1c; }
      [data-mentor-ui] .pw-foot { background: #eef2f7; padding: 14px 18px; display:flex; justify-content:flex-end; }
      [data-mentor-ui] .pw-btn {
        padding: 10px 18px; border-radius: 9999px; border: 0; color: #fff;
        background: #8B6F63; box-shadow: 0 6px 18px rgba(139,111,99,.35);
      }
      [data-mentor-ui] .pw-btn:disabled { opacity: .6; box-shadow: none; }

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

/* Uniform background (no decorative gradients) */
[data-mentor-ui]{ background-color: #f9fafb; background-image: none !important; }

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

/* ---- Account shell, soft purple ---- */

[data-mentor-ui] .acc-shell { --border: rgba(0,0,0,.08); --hover: rgba(0,0,0,.04); --pill: rgba(155,126,222,.12); }
[data-mentor-ui] .acc-titlebar{
  position: fixed;
  top: var(--navH);
  left: 0;
  right: 0;
  height: var(--titleH);
  background:#ffffffcc;
  backdrop-filter: blur(8px);
  border-bottom:1px solid rgba(0,0,0,.08);
  display:flex;
  align-items:center;
  z-index: 30;
}
  /* The frame that contains the left rail + content, below TopNav */
[data-mentor-ui] .acc-frame{
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: var(--navH); /* right under TopNav */
}
/* Left rail matches page background; keeps subtle divider */
[data-mentor-ui] .acc-rail{
  background: transparent; /* inherits global light background */
  border-right:1px solid rgba(0,0,0,.08);
}

[data-mentor-ui] .acc-link {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .6rem .8rem;
  border-radius: .75rem;
  transition: color .15s ease;
  color: #4B5563;            /* default gray-600 */
  font-weight: 400;
}

[data-mentor-ui] .acc-link:hover {
  color: #8B6F63; /* chocolate-500 on hover */
}

[data-mentor-ui] .acc-link.active {
  color: #8B6F63; /* chocolate-500 when active */
  font-weight: 600;
}

  [data-mentor-ui] .acc-card     { background:#fff; border:1px solid var(--border); border-radius:16px; }
  /* Primary button uses chocolate-500 */
  [data-mentor-ui] .btn-primary  { background:#8B6F63; color:#fff; border-radius:12px; padding:.55rem .9rem; }
  [data-mentor-ui] .btn-primary:hover { background:#7A5F58; transform: translateY(-1px); }
    
  [data-mentor-ui] .acc-card {
    background: rgba(255,255,255,.9);
    border: 1px solid rgba(0,0,0,.06);
    border-radius: 18px;
    box-shadow: 0 10px 30px rgba(0,0,0,.04);
  }
  [data-mentor-ui] .acc-label {
    display: block;
    font-size: 0.9rem;
    color: #4B5563;
    margin-bottom: 0.35rem;
  }
  [data-mentor-ui] .acc-input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,.12);
    padding: 0 14px;
    outline: none;
    background: #fff;
    transition: box-shadow .15s ease, border-color .15s ease;
  }
[data-mentor-ui] .acc-input:focus {
  border-color: var(--accent-grape);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent-grape) 28%, transparent);
}

/* Usage page pill header (does not cover left rail) */
[data-mentor-ui] .usage-pill{
  position: relative;
  background: #fff;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 18px;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 10px rgba(0,0,0,.04);
}
[data-mentor-ui] .usage-pill::after{
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 6px;
  height: 3px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #8ecae6, #2a9d8f, #8ecae6);
  opacity: .85;
  filter: blur(.2px);
}
  [data-mentor-ui] .btn-primary {
    padding: 10px 16px;
    border-radius: 12px;
    background: #8B6F63;
    color: #fff;
    transition: transform .15s ease, background .15s ease;
  }
  [data-mentor-ui] .btn-primary:hover { background: #7A5F58; transform: translateY(-1px); }
  [data-mentor-ui] .btn-secondary {
    padding: 10px 16px;
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,.12);
    background: #fff;
    transition: transform .15s ease, background .15s ease;
  }
  [data-mentor-ui] .btn-secondary:hover { background: #f8f8f8; transform: translateY(-1px); }
  [data-mentor-ui] .acc-check {
    display: inline-flex;
    align-items: center;
    font-size: 0.95rem;
    color: #374151;
  }
[data-mentor-ui] .acc-check input {
  width: 18px; height: 18px;
  accent-color: var(--accent-grape);
}
  [data-mentor-ui] .acc-hint {
    color: #6B7280;
    font-size: 0.85rem;
  }


/* Internal scrollbars only for the two panes */
[data-mentor-ui] .acc-scroll::-webkit-scrollbar,
[data-mentor-ui] .acc-rail::-webkit-scrollbar { width: 8px; }
[data-mentor-ui] .acc-scroll::-webkit-scrollbar-thumb,
[data-mentor-ui] .acc-rail::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.12);
  border-radius: 8px;
}

/* Heights for bars (tweak if your TopNav height differs) */
[data-mentor-ui]{
  --navH: 56px;   /* TopNav total height */
  --titleH: 48px; /* “Usage/Rewards/Profile” title bar height */
}

`

    
    }</style>
  )
}
