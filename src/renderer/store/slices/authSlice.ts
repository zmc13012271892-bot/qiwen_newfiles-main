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
  isLocalMode: false,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const API = (window as any).__API_URL__ || 'https://43.143.231.111:4443/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || '请求失败');
  return data;
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: { emailOrUsername: string; password: string; rememberMe: boolean }) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    return data.data as { accessToken: string; user: AuthUser };
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; username: string; password: string; displayName: string }) => {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    return data;
  }
);

export const refreshAccessToken = createAsyncThunk('auth/refresh', async () => {
  const data = await apiFetch('/auth/refresh', { method: 'POST' });
  return data.data.accessToken as string;
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await apiFetch('/auth/logout', { method: 'POST' });
});

export const fetchMe = createAsyncThunk('auth/me', async (_: void, { getState }) => {
  const token = (getState() as any).auth.accessToken;
  const data = await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data as AuthUser;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLocalMode: (state, action: PayloadAction<{ id?: string; username?: string; displayName?: string; avatarColor?: string } | undefined>) => {
      state.isLocalMode = true;
      state.isAuthenticated = true;
      if (action?.payload?.id) {
        // 恢复已有本地账号
        state.user = {
          id: action.payload.id,
          email: '',
          username: action.payload.username || '本地用户',
          displayName: action.payload.displayName || '本地用户',
          avatar: action.payload.avatarColor || '#4a9eff',
          plan: 'free',
          isVerified: false,
        };
      } else {
        // 生成随机本地账号
        const adjectives = ['勤奋的','好奇的','安静的','快乐的','认真的','睿智的','温暖的','活跃的'];
        const nouns = ['作家','学者','研究者','创作者','思考者','探索者','记录者','编辑者'];
        const colors = ['#4a9eff','#b88af0','#52c97a','#f0a742','#ff6b6b','#00c9b1','#ff8c42','#c8a96e'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const uid = 'local_' + Math.random().toString(36).slice(2, 10);
        state.user = {
          id: uid,
          email: '',
          username: uid,
          displayName: adj + noun,
          avatar: color,
          plan: 'free',
          isVerified: false,
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
      state.isLocalMode = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '登录失败';
        throw new Error(state.error);
      })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false; })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '注册失败';
        throw new Error(state.error);
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.accessToken = null;
        state.user = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isLocalMode = false;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      });
  },
});

export const { setLocalMode, setAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
