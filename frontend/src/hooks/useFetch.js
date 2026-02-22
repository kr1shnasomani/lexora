import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'

/**
 * Generic data-fetching hook with optional polling.
 *
 * loading  - true on the FIRST fetch only; stays true until data arrives.
 *            Subsequent polling refreshes do NOT re-trigger loading.
 * error    - set on any fetch failure; cleared on next success.
 * refetch  - manually re-trigger; shows loading only if no data yet.
 *
 * @param {string|null} path      - API path to GET, e.g. '/api/claims'
 * @param {number}      intervalMs - If > 0, silently re-fetches on this interval
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(path, intervalMs = 0) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(!!path)
    const [error, setError] = useState(null)
    const timerRef = useRef(null)
    const hasData = useRef(false)

    const fetchData = useCallback(async (silent = false) => {
        if (!path) return
        // Show loading skeleton only on first load or manual refetch with no data
        if (!silent && !hasData.current) setLoading(true)
        try {
            const result = await api.get(path)
            setData(result)
            setError(null)
            hasData.current = true
        } catch (err) {
            setError(err.message || 'Failed to load data')
        } finally {
            if (!silent || !hasData.current) setLoading(false)
        }
    }, [path])

    useEffect(() => {
        hasData.current = false
        setData(null)
        setError(null)
        setLoading(!!path)
        fetchData(false)

        if (intervalMs > 0) {
            timerRef.current = setInterval(() => fetchData(true), intervalMs)
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [fetchData, intervalMs, path])

    return { data, loading, error, refetch: () => fetchData(false) }
}

