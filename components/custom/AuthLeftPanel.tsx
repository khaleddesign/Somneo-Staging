'use client'

import { useEffect, useRef } from 'react'

export default function AuthLeftPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Create stars
    const stars: Array<{ x: number; y: number; radius: number; opacity: number; speed: number }> = []
    const starCount = 50

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.02 + 0.01,
      })
    }

    let animationId: number

    function animate() {
      if (!ctx || !canvas) return
      
      ctx.fillStyle = '#06111f'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        // Update opacity (twinkling effect)
        star.opacity += star.speed
        if (star.opacity >= 1 || star.opacity <= 0.3) {
          star.speed *= -1
        }

        // Draw star
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="hidden lg:flex w-1/2 bg-[#06111f] flex-col justify-between p-12 text-white relative overflow-hidden">
      {/* Canvas for stars */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-teal-400 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            SomnoConnect
          </h1>
          <p className="text-[#f0e8d6] opacity-70 text-sm">by SOMNOVENTIS</p>
        </div>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold mb-4 text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Le portail sécurisé pour vos études du sommeil
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Accédez à vos données de sommeil en toute sécurité. Notre plateforme est conforme aux normes de protection des données et garantit la confidentialité de vos informations médicales.
          </p>
        </div>
      </div>

      {/* Security Badge */}
      <div className="relative z-10 flex items-center gap-2 text-xs text-gray-300 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/10 w-fit">
        <span>🔒</span>
        <span>Données médicales chiffrées · RGPD</span>
      </div>
    </div>
  )
}
