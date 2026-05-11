import { createSlice } from '@reduxjs/toolkit';
import { Plugin } from '../../../shared/types';

interface PluginsState {
  installed: Plugin[];
  loading: boolean;
}

const pluginsSlice = createSlice({
  name: 'plugins',
  initialState: { installed: [] as Plugin[], loading: false },
  reducers: {
    setPlugins: (state, action) => { state.installed = action.payload; },
    togglePlugin: (state, action) => {
      const p = state.installed.find(p => p.id === action.payload);
      if (p) p.isEnabled = !p.isEnabled;
    },
  },
});

export const { setPlugins, togglePlugin } = pluginsSlice.actions;
export default pluginsSlice.reducer;
