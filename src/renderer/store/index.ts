import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import appReducer from './slices/appSlice';
import documentsReducer from './slices/documentsSlice';
import workspacesReducer from './slices/workspacesSlice';
import editorReducer from './slices/editorSlice';
import settingsReducer from './slices/settingsSlice';
import referencesReducer from './slices/referencesSlice';
import pluginsReducer from './slices/pluginsSlice';
import aiReducer from './slices/aiSlice';
import authReducer from './slices/authSlice';

const appPersistConfig = {
  key: 'qiwen-app',
  storage,
  // 只持久化侧边栏状态和活跃工作区，不持久化tabs（避免启动时残留上次标签页）
  whitelist: ['sidebarOpen', 'activeWorkspaceId', 'activeView'],
};

const persistConfig = {
  key: 'qiwen-root',
  storage,
  whitelist: ['settings'],
};

const persistedApp = persistReducer(appPersistConfig, appReducer);

const rootReducer = combineReducers({
  app: persistedApp,
  documents: documentsReducer,
  workspaces: workspacesReducer,
  editor: editorReducer,
  settings: settingsReducer,
  references: referencesReducer,
  plugins: pluginsReducer,
  ai: aiReducer,
  auth: authReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
