"use client"
import { useEffect, useRef, useState } from "react"

export default function FooterReveal() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setVisible(entry.isIntersecting))
    }, { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const yr = document.getElementById('footer-year')
    if (yr) yr.textContent = new Date().getFullYear().toString()
  }, [])

  return (
    <>
      <footer ref={ref} id="smart-footer" className={`reveal-footer ${visible ? 'is-visible' : ''} relative z-10 mt-20 mb-10`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="px-6 py-8 md:px-8">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-600">Company</h3>
                  <div className="mt-4 flex flex-col gap-2">
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition">Privacy</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition">Terms of use</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition">About</a>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-600">Features</h3>
                  <div className="mt-4 flex flex-col gap-2">
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">personalized report</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">ai mentor</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">1:1 expert session</a>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-600">Resources</h3>
                  <div className="mt-4 flex flex-col gap-2">
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">Blog</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">FAQs</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">Pricing</a>
                    <a href="#" className="focus-ring w-fit rounded-lg bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition">What's New</a>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-600">Connect with us</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href="#" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-grape)] hover:bg-[#874E95] px-4 py-2 text-sm font-medium transition shadow-sm text-white">Facebook</a>
                    <a href="#" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-grape)] hover:bg-[#874E95] px-4 py-2 text-sm font-medium transition shadow-sm text-white">Instagram</a>
                    <a href="#" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-grape)] hover:bg-[#874E95] px-4 py-2 text-sm font-medium transition shadow-sm text-white">TikTok</a>
                    <a href="#" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--accent-grape)] hover:bg-[#874E95] px-4 py-2 text-sm font-medium transition shadow-sm text-white">Twitter</a>
                  </div>
                </div>
              </div>

              <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-gray-500">© <span id="footer-year" /> BecomeFamous.AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .reveal-footer { transition: transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms ease; transform: translateY(24px); opacity: 0; will-change: transform, opacity; }
        .reveal-footer.is-visible { transform: translateY(0%); opacity: 1; }
        .focus-ring:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(94,231,191,0.5), 0 0 0 6px rgba(158,93,171,0.35); }
      `}</style>
    </>
  )
}
