'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { habitatProjects, parseProject } from '@/lib/habitat/projects';
import {
  clientId,
  newSnapshot,
  type HabitatProject,
  type HabitatSnapshot,
} from '@/lib/habitat/workspace';
import { parseSavedHabitat } from '@/lib/habitat/planner';

export function useHabitatProjects(userId: string | undefined, token: string | null) {
  const owner = userId || 'guest',
    key = `captivia:habitats:v2:${owner}`;
  const [local, setLocal] = useState<HabitatProject[]>([]),
    [cloud, setCloud] = useState<HabitatProject[]>([]);
  const [dataOwner, setDataOwner] = useState(key);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const scope = useRef(key),
    localRef = useRef<HabitatProject[]>([]),
    sequence = useRef(0);
  // The owner captured by each operation is checked before any asynchronous result is applied.
  useEffect(() => {
    scope.current = key;
    const version = ++sequence.current;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setDataOwner(key);
      setCloud([]);
      setLocal([]);
      localRef.current = [];
      setMessage('');
      setBusy(false);
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]');
        let projects: HabitatProject[] = Array.isArray(raw)
          ? raw
              .slice(0, 50)
              .map(parseProject)
              .filter((p): p is HabitatProject => p !== null)
          : [];
        if (!projects.length) {
          const legacy = parseSavedHabitat(
            localStorage.getItem(`captivia:habitat:v1:${owner}`) || ''
          );
          if (legacy)
            projects = [
              {
                id: 'local-imported-v1',
                name: 'Mon ancien projet',
                revision: 1,
                updatedAt: legacy.savedAt,
                snapshot: newSnapshot(
                  legacy.profileId,
                  legacy.dimensions,
                  legacy.variant,
                  legacy.animalId
                ),
              },
            ];
        }
        if (active) {
          localRef.current = projects;
          setLocal(projects);
        }
      } catch {
        if (active)
          setMessage(
            'La bibliothèque locale ne peut pas être lue. Les exports restent disponibles.'
          );
      }
      if (token) {
        setBusy(true);
        try {
          const projects = await habitatProjects.list(token);
          if (active && version === sequence.current) setCloud(projects);
        } catch {
          if (active)
            setMessage(
              'Les projets du compte sont indisponibles. Vous pouvez travailler et sauvegarder sur cet appareil.'
            );
        } finally {
          if (active && version === sequence.current) setBusy(false);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [key, owner, token]);
  const persist = useCallback(
    (projects: HabitatProject[]) => {
      if (scope.current !== key) throw new Error('Le compte a changé. Réessayez.');
      try {
        localStorage.setItem(key, JSON.stringify(projects));
      } catch {
        throw new Error(
          'Le stockage de cet appareil est plein ou indisponible. Exportez le projet ou enregistrez-le dans votre compte.'
        );
      }
      localRef.current = projects;
      setLocal(projects);
    },
    [key]
  );
  const saveLocal = useCallback(
    (name: string, snapshot: HabitatSnapshot, id?: string) => {
      const current = id ? localRef.current.find((p) => p.id === id) : undefined;
      if (!current && localRef.current.length >= 50)
        throw new Error(
          'La bibliothèque locale contient déjà 50 projets. Exportez puis supprimez un projet.'
        );
      const project: HabitatProject = {
        id: current?.id || `local-${clientId()}`,
        name,
        snapshot,
        revision: (current?.revision || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      persist([project, ...localRef.current.filter((p) => p.id !== project.id)]);
      return project;
    },
    [persist]
  );
  const saveCloud = useCallback(
    async (name: string, snapshot: HabitatSnapshot, current?: HabitatProject) => {
      if (!token) throw new Error('Connectez-vous pour enregistrer dans votre compte.');
      const operationScope = scope.current;
      setBusy(true);
      try {
        const project = await habitatProjects.save(token, name, snapshot, current);
        if (scope.current !== operationScope) throw new Error('Le compte a changé.');
        setCloud((previous) => [project, ...previous.filter((p) => p.id !== project.id)]);
        return project;
      } finally {
        if (scope.current === operationScope) setBusy(false);
      }
    },
    [token]
  );
  const reload = useCallback(async () => {
    if (!token) return;
    const operationScope = scope.current;
    setBusy(true);
    try {
      const projects = await habitatProjects.list(token);
      if (scope.current === operationScope) setCloud(projects);
    } catch {
      if (scope.current === operationScope)
        setMessage('Impossible d’actualiser les projets du compte.');
    } finally {
      if (scope.current === operationScope) setBusy(false);
    }
  }, [token]);
  const remove = useCallback(
    async (project: HabitatProject, storage: 'local' | 'cloud') => {
      if (storage === 'local') {
        persist(localRef.current.filter((p) => p.id !== project.id));
        return;
      }
      if (!token) throw new Error('Connectez-vous pour gérer vos projets.');
      const operationScope = scope.current;
      setBusy(true);
      try {
        await habitatProjects.remove(token, project);
        if (scope.current === operationScope)
          setCloud((previous) => previous.filter((p) => p.id !== project.id));
      } finally {
        if (scope.current === operationScope) setBusy(false);
      }
    },
    [persist, token]
  );
  return {
    local: dataOwner === key ? local : [],
    cloud: dataOwner === key ? cloud : [],
    busy,
    message,
    saveLocal,
    saveCloud,
    reload,
    remove,
  };
}
