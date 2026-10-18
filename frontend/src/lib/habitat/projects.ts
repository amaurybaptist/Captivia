import { getApiBase } from '@/lib/api';
import { parseSnapshot, type HabitatProject, type HabitatSnapshot } from './workspace';

export class ProjectRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(
  path: string,
  token: string,
  method = 'GET',
  data?: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${getApiBase()}/users/me/habitats${path}`, {
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(data ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (
        response.status === 403 &&
        body?.code === 'PREMIUM_REQUIRED' &&
        typeof window !== 'undefined'
      )
        window.dispatchEvent(new Event('habitat:premium-required'));
      throw new ProjectRequestError(
        response.status === 401
          ? 'Votre session a expiré. Reconnectez-vous pour accéder aux projets du compte.'
          : response.status >= 500 ||
              (typeof body?.message === 'string' && body.message.startsWith('Cannot '))
            ? 'La sauvegarde du compte est indisponible. Vous pouvez conserver une copie locale.'
            : typeof body?.message === 'string'
              ? body.message
              : 'Impossible d’accéder aux projets. Votre copie locale reste disponible.',
        response.status,
      );
    }
    return body;
  } catch (error) {
    if (controller.signal.aborted)
      throw new ProjectRequestError(
        'La connexion au compte prend trop de temps. Gardez une copie locale et réessayez.',
        408,
      );
    if (error instanceof TypeError)
      throw new ProjectRequestError(
        'Connexion au compte impossible. Vérifiez le réseau ou gardez une copie locale.',
        0,
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export function parseProject(input: unknown): HabitatProject | null {
  if (!input || typeof input !== 'object') return null;
  const p = input as Record<string, unknown>,
    snapshot = parseSnapshot(p.snapshot);
  if (
    !snapshot ||
    typeof p.id !== 'string' ||
    typeof p.name !== 'string' ||
    !p.name.trim() ||
    p.name.length > 80 ||
    !Number.isSafeInteger(p.revision) ||
    Number(p.revision) < 1 ||
    typeof p.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(p.updatedAt))
  )
    return null;
  return { id: p.id, name: p.name, revision: Number(p.revision), updatedAt: p.updatedAt, snapshot };
}
export const habitatProjects = {
  async list(token: string): Promise<HabitatProject[]> {
    const data = await request('', token);
    if (!Array.isArray(data)) throw new Error('Liste de projets invalide.');
    return data.map(parseProject).filter((p): p is HabitatProject => p !== null);
  },
  async save(
    token: string,
    name: string,
    snapshot: HabitatSnapshot,
    current?: { id: string; revision: number },
  ): Promise<HabitatProject> {
    const data = await request(
      current ? `/${encodeURIComponent(current.id)}` : '',
      token,
      current ? 'PATCH' : 'POST',
      { name, snapshot, ...(current ? { revision: current.revision } : {}) },
    );
    const project = parseProject(data);
    if (!project)
      throw new Error('Le projet enregistré ne peut pas être relu. Conservez votre export local.');
    return project;
  },
  async remove(token: string, project: HabitatProject) {
    await request(
      `/${encodeURIComponent(project.id)}?revision=${project.revision}`,
      token,
      'DELETE',
    );
  },
};
