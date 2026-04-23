// En production : frontend et backend sur la même origine → URLs relatives
// En dev : backend sur localhost:3001, frontend sur localhost:5173
const BASE: string = import.meta.env.VITE_BACKEND_URL
  ?? (import.meta.env.DEV ? 'http://localhost:3001' : '');

function getToken(): string | null {
  return localStorage.getItem('aa_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const api = {
  register: (b: { username:string; password:string; establishment:string; level:string; email?:string }) =>
    request<{ token:string; user: unknown }>('/api/auth/register', { method:'POST', body: JSON.stringify(b) }),

  login: (b: { username:string; password:string }) =>
    request<{ token:string; user: unknown }>('/api/auth/login', { method:'POST', body: JSON.stringify(b) }),

  me: () => request<unknown>('/api/auth/me'),

  updateProfile: (b: { establishment?:string; level?:string }) =>
    request<unknown>('/api/auth/me', { method:'PATCH', body: JSON.stringify(b) }),

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    const token = getToken();
    return fetch(`${BASE}/api/auth/me/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then((r) => r.json());
  },

  getUser: (id: string) => request<unknown>(`/api/auth/user/${id}`),

  // ── Problems ────────────────────────────────────────────────────────────────
  getProblems: (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ total:number; page:number; problems: unknown[] }>(`/api/problems${q}`);
  },

  getProblem: (id: string) => request<unknown>(`/api/problems/${id}`),
  submitProblem: (b: unknown) =>
    request<{ message:string; id:string }>('/api/problems', { method:'POST', body: JSON.stringify(b) }),

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  getPlayerLB: (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ total:number; page:number; players:unknown[] }>(`/api/leaderboard/players${q}`);
  },

  getEstablishmentLB: (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ total:number; establishments:unknown[] }>(`/api/leaderboard/establishments${q}`);
  },

  getClanLB: (params?: Record<string,string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ total:number; clans:unknown[] }>(`/api/leaderboard/clans${q}`);
  },

  // ── Clans ──────────────────────────────────────────────────────────────────
  getClans:    () => request<unknown[]>('/api/clans'),
  getClan:     (id:string) => request<unknown>(`/api/clans/${id}`),
  createClan:  (b:unknown) => request<unknown>('/api/clans', { method:'POST', body:JSON.stringify(b) }),
  joinClan:    (id:string) => request<unknown>(`/api/clans/${id}/join`, { method:'POST', body:'{}' }),
  leaveClan:   () => request<unknown>('/api/clans/leave', { method:'POST', body:'{}' }),

  // ── Friends ────────────────────────────────────────────────────────────────
  getFriends:       () => request<unknown[]>('/api/friends'),
  getFriendReqs:    () => request<unknown[]>('/api/friends/requests'),
  sendFriendReq:    (username:string) => request<unknown>(`/api/friends/request/${username}`, { method:'POST', body:'{}' }),
  acceptFriendReq:  (id:string) => request<unknown>(`/api/friends/accept/${id}`, { method:'POST', body:'{}' }),
  removeFriend:     (id:string) => request<unknown>(`/api/friends/${id}`, { method:'DELETE' }),

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminStats:       () => request<unknown>('/api/admin/stats'),
  adminPending:     () => request<unknown>('/api/admin/problems/pending'),
  adminApproveProblem: (id:string) => request<unknown>(`/api/admin/problems/${id}/approve`, { method:'POST', body:'{}' }),
  adminRejectProblem:  (id:string) => request<unknown>(`/api/admin/problems/${id}/reject`,  { method:'POST', body:'{}' }),
  adminBanUser:     (id:string) => request<unknown>(`/api/admin/users/${id}/ban`,   { method:'POST', body:'{}' }),
  adminUnbanUser:   (id:string) => request<unknown>(`/api/admin/users/${id}/unban`, { method:'POST', body:'{}' }),
  adminListUsers:   (q?:string) => request<unknown>(`/api/admin/users${q?`?q=${q}`:''}`)  ,
  avatarUrl: (filename: string | null) => filename ? `${BASE}/uploads/${filename}` : null,
};
