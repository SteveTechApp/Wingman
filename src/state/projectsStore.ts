import * as React from "react";


export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

const LS_KEY = "wingman.projects.v1";

type StoreState = {
  projects: ProjectRecord[];
  activeProjectId: string | null;
};

function safeParse(json: string | null): StoreState {
  if (!json) return { projects: [], activeProjectId: null };
  try {
    const o = JSON.parse(json);
    const projects = Array.isArray(o?.projects) ? o.projects : [];
    const activeProjectId = typeof o?.activeProjectId === "string" ? o.activeProjectId : null;
    return { projects, activeProjectId };
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

function save(state: StoreState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state, null, 2));
  } catch {
    // ignore
  }
}

function uid() {
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

let state: StoreState = safeParse(typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null);
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeProjects(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProjectsState(): StoreState {
  return state;
}

export function getActiveProject(): ProjectRecord | null {
  if (!state.activeProjectId) return null;
  return state.projects.find(p => p.id === state.activeProjectId) ?? null;
}

export function setActiveProject(id: string | null) {
  state = { ...state, activeProjectId: id };
  save(state);
  emit();
}

export function createProject(name: string): ProjectRecord {
  const now = Date.now();
  const p: ProjectRecord = { id: uid(), name: name.trim() || "Untitled Project", createdAt: now, updatedAt: now };
  state = { ...state, projects: [p, ...state.projects], activeProjectId: p.id };
  save(state);
  emit();
  return p;
}

export function renameProject(id: string, name: string) {
  const n = name.trim() || "Untitled Project";
  state = {
    ...state,
    projects: state.projects.map(p => p.id === id ? { ...p, name: n, updatedAt: Date.now() } : p),
  };
  save(state);
  emit();
}

export function deleteProject(id: string) {
  const next = state.projects.filter(p => p.id !== id);
  const activeProjectId = state.activeProjectId === id ? (next[0]?.id ?? null) : state.activeProjectId;
  state = { projects: next, activeProjectId };
  save(state);
  emit();
}

export function touchActiveProject() {
  if (!state.activeProjectId) return;
  state = {
    ...state,
    projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, updatedAt: Date.now() } : p),
  };
  save(state);
  emit();
}



