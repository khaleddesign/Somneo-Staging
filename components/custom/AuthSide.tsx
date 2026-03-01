"use client"

import { useEffect, useRef } from 'react'

interface AuthSideProps {
  title?: string
  subtitle?: string
}

export default function AuthSide({
  title = 'SOMNOVENTIS',
  subtitle = 'Portail SomnoConnect',
}: AuthSideProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const stars: { x: number; y: number; radius: number; vx: number }[] = []
    const count = 100
    const width = (canvas.width = canvas.offsetWidth)
    const height = (canvas.height = canvas.offsetHeight)

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.2,
        vx: Math.random() * 0.05 + 0.02,
      })
    }

    function animate() {
      // ctx is definitely non-null here due to the early return above
      ctx!.clearRect(0, 0, width, height)
      ctx!.fillStyle = '#fff'
      stars.forEach((s) => {
        s.x -= s.vx
        if (s.x < 0) s.x = width
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx!.fill()
      })
      requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return (
    <div className="hidden lg:flex w-2/5 bg-[#06111f] relative">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="p-8 z-10 flex flex-col justify-center">
        <h1 className="text-4xl font-syne text-[#1ec8d4] mb-4">{title}</h1>
        <p className="text-xl font-dm text-[#f0e8d6]">{subtitle}</p>
      </div>
    </div>
  )
}
