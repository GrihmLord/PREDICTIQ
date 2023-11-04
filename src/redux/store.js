// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(/* other middlewares here */),
  devTools: process.env.NODE_ENV !== 'production', // Automatically use Redux DevTools if not in production
});

export default store;
