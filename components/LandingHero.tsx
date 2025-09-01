"use client"
import { useEffect, useState } from "react"

export default function LandingHero() {
  const [flip, setFlip] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setFlip(f => !f), 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="w-full relative">
      {/* Absolutely position brand top-left */}
      {/* <div className="absolute top-0 left-10 font-bold text-sm md:text-base tracking-tight text-gray-900" style={{ fontFamily: 'inherit' }}>
        marketing mentor ai
      </div> */}

      {/* Hero section */}
      <div className="flex items-center justify-center px-6 pt-16"> 
        <div className="text-center max-w-3xl mx-auto">
          {/* decorative circle */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full circle-bg flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[var(--soft-purple)] opacity-60" />
          </div>

          {/* headline */}
          <h1 className="text-5xl md:text-7xl font-light leading-tight mb-4">
            your go-to<br />
            <span className="gradient-text font-medium">marketing mentor</span>
          </h1>

          {/* cross-fading subline */}
          <div className="h-8 relative select-none mt-2" aria-live="polite">
            <p
              className={`absolute inset-0 text-gray-600 text-lg md:text-xl transition-opacity duration-600 ${
                flip ? "opacity-0" : "opacity-100"
              }`}
            >
              are you ready to become famous?
            </p>
            <p
              className={`absolute inset-0 text-gray-600 text-lg md:text-xl transition-opacity duration-600 ${
                flip ? "opacity-100" : "opacity-0"
              }`}
            >
              let’s build your path to fame.
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}