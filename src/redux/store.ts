// src/redux/store.ts
// Redux store configuration with all slices

import {configureStore} from '@reduxjs/toolkit';
import scenarioReducer from './slices/scenarioSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    scenarios: scenarioReducer,
    settings: settingsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for dates
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
