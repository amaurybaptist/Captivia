import { getApiBase } from '@/lib/api';
import type { Agenda, Kind } from './calendar';
async function request(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBase()}/users/me/${path}`, {
    ...options,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? 'Votre session a expiré. Reconnectez-vous.'
        : response.status === 403
          ? 'Ce soin nécessite un abonnement Premium.'
          : typeof data?.message === 'string'
            ? data.message
            : 'Le soin n’a pas pu être enregistré. Réessayez.',
    );
  return data;
}
const endpoints: Record<Kind, string> = {
  routine: 'routines',
  appointment: 'vet-appointments',
  medication: 'medications',
  vaccination: 'vaccinations',
};
export const careAgenda = {
  async read(
    token: string,
    from: string,
    to: string,
    animalId: string,
    signal: AbortSignal,
  ): Promise<Agenda> {
    const query = new URLSearchParams({ from, to, ...(animalId ? { animalId } : {}) });
    return request(`care-agenda?${query}`, token, { signal });
  },
  async save(
    token: string,
    kind: Kind,
    animalId: string,
    id: string | undefined,
    data: Record<string, unknown>,
  ) {
    return request(
      `animals/${encodeURIComponent(animalId)}/${endpoints[kind]}${id ? '/' + encodeURIComponent(id) : ''}`,
      token,
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) },
    );
  },
};
