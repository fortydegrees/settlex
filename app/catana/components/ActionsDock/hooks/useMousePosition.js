import { useSpring } from '@react-spring/web'
import { useEffect, useMemo } from 'react'

export const useMousePosition = (springProps, springDeps) => {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0, ...springProps }), springDeps)

  useEffect(() => {
    const handleMouseMove = (event) => {
      api.start({ x: event.clientX, y: event.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [api])
  return useMemo(
    () => ({
      x,
      y,
    }),
    [x, y]
  )
}
