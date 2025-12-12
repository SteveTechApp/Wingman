export type NavItem = {
  path: string;
  label: string;
  end?: boolean;
};

export const NAV_LINKS: NavItem[] = [
  { path: '/', label: 'Dashboard', end: true },
  { path: '/setup', label: 'New Project', end: false },
  { path: '/agent', label: 'Analyze Intel', end: false },
  { path: '/templates', label: 'Templates', end: false },
  { path: '/training', label: 'Training', end: false },
];
