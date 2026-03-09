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
    const stars: Array<{ x: number; y: number; radius: number; opacity: number; speed: number; dx: number; dy: number }> = []
    const starCount = 50

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.02 + 0.01,
        dx: (Math.random() - 0.5) * 0.06,
        dy: (Math.random() - 0.5) * 0.06,
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

        star.x += star.dx
        star.y += star.dy

        if (star.x < 0) star.x = canvas.width
        if (star.x > canvas.width) star.x = 0
        if (star.y < 0) star.y = canvas.height
        if (star.y > canvas.height) star.y = 0

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
    <div className="flex w-full lg:basis-[45%] bg-midnight flex-col justify-between p-8 lg:p-12 text-white relative overflow-hidden min-h-[40vh] lg:min-h-screen">
      {/* Canvas for stars */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl text-teal mb-2 font-display leading-tight">
            SomnoConnect
          </h1>
          <p className="text-sand/40 text-[9px] tracking-[3px] uppercase font-heading">BY SOMNOVENTIS</p>
        </div>

        <div className="max-w-md">
          <h2 className="text-lg lg:text-xl mb-3 text-sand/90 font-heading font-medium">
            Plateforme sécurisée d&apos;analyse du sommeil
          </h2>
          <p className="text-sand/60 italic text-sm leading-relaxed font-body max-w-sm">
            Infrastructure médicale sécurisée pour centraliser vos études, échanges cliniques et rapports en toute confidentialité.
          </p>
        </div>
      </div>

      {/* Security Badge */}
      <div className="relative z-10 flex items-center gap-2 text-xs text-sand/80 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 w-fit font-body">
        <span>🔒</span>
        <span>Badge RGPD · Données médicales chiffrées</span>
      </div>
    </div>
  )
}
