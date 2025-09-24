'use client'

import { useEffect, useState } from 'react'

export const useHydration = () => {
  const [is_hydrated, set_is_hydrated] = useState(false)

  useEffect(() => {
    set_is_hydrated(true)
  }, [])

  return is_hydrated
}