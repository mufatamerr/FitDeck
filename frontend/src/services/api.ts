import { type GetTokenSilentlyOptions } from '@auth0/auth0-react'

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getAccessTokenSilently: (
      options?: GetTokenSilentlyOptions,
    ) => Promise<string>,
  ) {}

  private async _getToken(audience?: string): Promise<string> {
    try {
      return await this.getAccessTokenSilently(
        audience ? { authorizationParams: { audience } } : undefined,
      )
    } catch {
      const devToken = sessionStorage.getItem('admin_token')
      if (devToken) return devToken
      throw new Error('Not authenticated')
    }
  }

  async fetchJson<T>(path: string, init: RequestInit = {}, audience?: string): Promise<T> {
    const token = await this._getToken(audience)

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })

    const data = (await res.json().catch(() => null)) as T | null
    if (!res.ok) {
      const err = data as unknown as { error?: string; detail?: string }
      throw new Error(err?.detail || err?.error || `HTTP ${res.status}`)
    }
    if (data === null) throw new Error('Invalid JSON response')
    return data
  }

  async postFormData<T>(path: string, form: FormData, audience?: string): Promise<T> {
    const token = await this._getToken(audience)

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    })

    const data = (await res.json().catch(() => null)) as T | null
    if (!res.ok) {
      const err = data as unknown as { error?: string; detail?: string }
      throw new Error(err?.detail || err?.error || `HTTP ${res.status}`)
    }
    if (data === null) throw new Error('Invalid JSON response')
    return data
  }
}

