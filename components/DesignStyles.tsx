// components/DesignStyles.tsx
"use client"

/**
 * Pure styling injector:
 * - Adds CSS vars, subtle animations, and UI accents.
 * - No wording/logic changes.
 * - All effects are scoped under [data-mentor-ui].
 */
export default function DesignStyles() {
  return (
    <style jsx global>{`
      :root {
        --soft-purple: #9B7EDE;
        --earth-brown: #8B7355;
        --earth-green: #7A8471;
      }

      /* Scope all styles so they only apply where you opt-in */
      [data-mentor-ui] {
        --bg-grad: radial-gradient(1200px 600px at 90% -10%, rgba(155,126,222,.08), transparent 60%),
                   radial-gradient(1000px 600px at 10% 110%, rgba(122,132,113,.06), transparent 60%);
        background-image: var(--bg-grad);
        background-attachment: fixed;
      }

      [data-mentor-ui] .circle-bg {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      }
      [data-mentor-ui] .gradient-text {
        background: linear-gradient(135deg, var(--soft-purple), var(--earth-green));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      [data-mentor-ui] .dashboard-card {
        background: rgba(255,255,255,.8);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,.2);
      }
      [data-mentor-ui] .bg-soft-purple { background-color: var(--soft-purple); }

      /* Animations */
      @keyframes fadeIn { from { opacity:0; transform: translateY(20px);} to { opacity:1; transform: translateY(0);} }
      @keyframes slideUp { from { opacity:0; transform: translateY(30px);} to { opacity:1; transform: translateY(0);} }
      @keyframes pulseGentle { 0%,100% { transform: scale(1);} 50% { transform: scale(1.04);} }

      [data-mentor-ui] .fade-in { animation: fadeIn .8s ease-in-out both; }
      [data-mentor-ui] .slide-up { animation: slideUp .6s ease-out both; }
      [data-mentor-ui] .pulse-gentle { animation: pulseGentle 2s infinite; }

      /* Button micro-interaction for rounded-xl elements */
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
    `}</style>
  );
}