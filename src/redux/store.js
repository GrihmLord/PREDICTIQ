// src/redux/store.js
import { createStore, applyMiddleware } from 'redux';
import rootReducer from './reducers';
import thunk from 'redux-thunk'; // You can use Redux Thunk for async actions

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;
