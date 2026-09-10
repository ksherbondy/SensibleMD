import { useEffect, useState } from 'react'

// This matches the existing responsive spread breakpoint. It selects columns,
// not page-break geometry; the requested spread capacity remains unchanged.
export function usePageStep(spread: boolean) {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const update = () => setNarrow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return spread && !narrow ? 2 : 1
}
