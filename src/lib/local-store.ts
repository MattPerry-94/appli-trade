"use client";

import { useSyncExternalStore } from "react";

// Petit magasin de données enregistré dans le navigateur (localStorage), partagé entre
// les composants et synchronisé entre onglets. Aucun compte, rien n'est envoyé ailleurs.

export interface LocalStore<T> {
  key: string;
  read: () => T;
  write: (value: T) => void;
  subscribe: (l: () => void) => () => void;
  use: () => T;
}

export function createLocalStore<T>(key: string, empty: T, validate: (raw: unknown) => T = (r) => r as T): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cache: T | null = null;

  const read = (): T => {
    if (cache !== null) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? validate(JSON.parse(raw)) : empty;
    } catch {
      cache = empty;
    }
    return cache;
  };

  const write = (value: T) => {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible (navigation privée…) : on garde en mémoire */
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        cache = null;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  const use = () => useSyncExternalStore(subscribe, read, () => empty);

  return { key, read, write, subscribe, use };
}

export const asArray = <T,>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
