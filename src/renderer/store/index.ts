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

// app只持久化侧边栏开关和活跃工作区，tabs/activeView每次重置
const appPersistConfig = {
  key: 'qiwen-app',
  storage,
  whitelist: ['sidebarOpen', 'activeWorkspaceId'],
};

const rootReducer = combineReducers({
  app: persistReducer(appPersistConfig, appReducer),
  documents: documentsReducer,
  workspaces: workspacesReducer,
  editor: editorReducer,
  settings: persistReducer({ key: 'qiwen-settings', storage }, settingsReducer),
  references: referencesReducer,
  plugins: pluginsReducer,
  ai: aiReducer,
  auth: authReducer,
});

export const store = configureStore({
  reducer: rootReducer,
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
