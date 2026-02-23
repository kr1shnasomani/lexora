/**
 * Central API client for the Lexora backend.
 * All requests go through here so the base URL is configured in one place.
 *
 * Set VITE_API_URL in your .env file (default: http://localhost:8000).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(method, path, body) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    }
    if (body !== undefined) {
        options.body = JSON.stringify(body)
    }

    const res = await fetch(`${BASE_URL}${path}`, options)

    if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
            const json = await res.json()
            detail = json.detail || detail
        } catch (_) { /* ignore parse errors */ }
        throw new Error(detail)
    }

    // 204 No Content — return null
    if (res.status === 204) return null

    return res.json()
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
}

export const downloadClaimPDF = async (claimId, email) => {
    // Assuming BASE_URL from the file scope to keep it uniform
    const url = `${BASE_URL}/api/claims/${claimId}/export-pdf?email=${encodeURIComponent(email)}`;
    const response = await fetch(url, {
        method: 'GET',
    });

    if (!response.ok) {
        let msg = 'Failed to generate PDF';
        try {
            const data = await response.json();
            if (data.detail) msg = data.detail;
        } catch (e) { }
        throw new Error(msg);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Lexora_Claim_${claimId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
}
