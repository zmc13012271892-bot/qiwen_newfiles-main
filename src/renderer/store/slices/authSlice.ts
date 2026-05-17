import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  plan: string;
  isVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLocalMode: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLocalMode: true,   // 始终本地模式
  isAuthenticated: false,
  loading: false,
  error: null,
};

// ── 本地账号存储 key ──────────────────────────────────────
const ACCOUNTS_KEY = 'qiwen_local_accounts';

function loadAccounts(): Record<string, { id: string; username: string; displayName: string; avatar: string; passwordHash: string }> {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); } catch { return {}; }
}

function saveAccounts(accounts: ReturnType<typeof loadAccounts>) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch {}
}

// 简单哈希（非加密用途，仅本地验证）
function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

// ── 本地注册 ──────────────────────────────────────────────
export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; username: string; password: string; displayName: string }) => {
    const accounts = loadAccounts();
    // 检查用户名是否已存在
    const exists = Object.values(accounts).some(a => a.username === payload.username);
    if (exists) throw new Error('该用户名已被注册');
    if (payload.password.length < 6) throw new Error('密码至少6位');

    const id = 'local_' + Math.random().toString(36).slice(2, 10);
    const colors = ['#4a9eff', '#b88af0', '#52c97a', '#f0a742', '#ff6b6b', '#c8a96e'];
    const avatar = colors[Math.floor(Math.random() * colors.length)];

    accounts[payload.username] = {
      id,
      username: payload.username,
      displayName: payload.displayName || payload.username,
      avatar,
      passwordHash: simpleHash(payload.password),
    };
    saveAccounts(accounts);

    return {
      id, email: payload.email,
      username: payload.username,
      displayName: payload.displayName || payload.username,
      avatar, plan: 'free', isVerified: true,
    } as AuthUser;
  }
);

// ── 本地登录 ──────────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: { emailOrUsername: string; password: string; rememberMe: boolean }) => {
    const accounts = loadAccounts();
    const account = accounts[payload.emailOrUsername];
    if (!account) throw new Error('用户名不存在');
    if (account.passwordHash !== simpleHash(payload.password)) throw new Error('密码错误');

    return {
      accessToken: 'local_token',
      user: {
        id: account.id,
        email: '',
        username: account.username,
        displayName: account.displayName,
        avatar: account.avatar,
        plan: 'free',
        isVerified: true,
      } as AuthUser,
    };
  }
);

// ── 自动恢复会话 ──────────────────────────────────────────
export const refreshAccessToken = createAsyncThunk('auth/refresh', async () => {
  // 本地模式：从 localStorage 恢复上次登录的用户
  const last = localStorage.getItem('qiwen_last_user');
  if (last) {
    const user = JSON.parse(last) as AuthUser;
    return { accessToken: 'local_token', user };
  }
  throw new Error('no session');
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('qiwen_last_user');
});

// 兼容占位（不再使用）
export const fetchMe = createAsyncThunk('auth/me', async () => null);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLocalMode: (state, action: PayloadAction<{ id?: string; username?: string; displayName?: string; avatarColor?: string } | undefined>) => {
      state.isLocalMode = true;
      state.isAuthenticated = true;
      if (action?.payload?.id) {
        state.user = {
          id: action.payload.id,
          email: '',
          username: action.payload.username || '本地用户',
          displayName: action.payload.displayName || '本地用户',
          avatar: action.payload.avatarColor || '#c8a96e',
          plan: 'free',
          isVerified: false,
        };
      } else {
        const adjectives = ['勤奋的','好奇的','安静的','快乐的','认真的','睿智的'];
        const nouns = ['作家','学者','研究者','创作者','思考者','探索者'];
        const colors = ['#4a9eff','#b88af0','#52c97a','#f0a742','#ff6b6b','#c8a96e'];
        const uid = 'local_' + Math.random().toString(36).slice(2, 10);
        state.user = {
          id: uid, email: '',
          username: uid,
          displayName: adjectives[~~(Math.random()*adjectives.length)] + nouns[~~(Math.random()*nouns.length)],
          avatar: colors[~~(Math.random()*colors.length)],
          plan: 'free', isVerified: false,
        };
      }
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLocalMode = false;  // 真正退出，让 App.tsx 能检测到
      localStorage.removeItem('qiwen_last_user');
    },
  },
  extraReducers: (builder) => {
    builder
      // 登录
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isLocalMode = true;
        // 持久化会话
        try { localStorage.setItem('qiwen_last_user', JSON.stringify(action.payload.user)); } catch {}
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '登录失败';
      })
      // 注册
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.accessToken = 'local_token';
        state.isAuthenticated = true;
        state.isLocalMode = true;
        try { localStorage.setItem('qiwen_last_user', JSON.stringify(action.payload)); } catch {}
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '注册失败';
      })
      // 恢复会话
      .addCase(refreshAccessToken.fulfilled, (state, action: any) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isLocalMode = true;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      // 退出
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isLocalMode = false;
      });
  },
});

export const { setLocalMode, setAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
