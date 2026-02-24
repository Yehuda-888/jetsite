import { useEffect, useMemo, useRef, useState } from 'react'

const API_ROOT = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

async function fetchSummary(title, signal) {
  const response = await fetch(`${API_ROOT}${encodeURIComponent(title)}`, {
    method: 'GET',
    headers: {
      'api-user-agent': 'JetAtlas/1.0 (educational aircraft reference)'
    },
    signal
  })

  if (!response.ok) {
    return null
  }

  const payload = await response.json()

  return {
    extract: payload.extract || '',
    image: payload.originalimage?.source || payload.thumbnail?.source || null,
    pageUrl: payload.content_urls?.desktop?.page || null
  }
}

export function useWikiSummaries(titles) {
  const cacheRef = useRef({})
  const [items, setItems] = useState({})

  const uniqueTitles = useMemo(() => {
    return [...new Set(titles.filter(Boolean))]
  }, [titles])

  // Use a serialized key so the effect only re-runs when the actual
  // title values change, not just when the array reference changes.
  const titlesKey = uniqueTitles.join('\0')

  useEffect(() => {
    const currentTitles = titlesKey.split('\0').filter(Boolean)
    if (currentTitles.length === 0) return

    const controller = new AbortController()
    let alive = true

    const load = async () => {
      const results = await Promise.all(
        currentTitles.map(async (title) => {
          if (Object.hasOwn(cacheRef.current, title)) {
            return [title, cacheRef.current[title]]
          }

          try {
            const summary = await fetchSummary(title, controller.signal)
            cacheRef.current[title] = summary
            return [title, summary]
          } catch (error) {
            // Don't cache abort errors — they happen during cleanup
            // and would permanently lose data for that title.
            if (error?.name !== 'AbortError') {
              cacheRef.current[title] = null
            }
            return [title, null]
          }
        })
      )

      if (alive) {
        setItems(Object.fromEntries(results))
      }
    }

    load()

    return () => {
      alive = false
      controller.abort()
    }
  }, [titlesKey])

  return items
}
