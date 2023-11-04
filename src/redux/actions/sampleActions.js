// src/redux/actions/sampleActions.js

// Define action types as constants
export const SAMPLE_ACTION = 'SAMPLE_ACTION';

// Action creator with payload
export const sampleAction = (data) => ({
  type: SAMPLE_ACTION,
  payload: data,
});

// Usage example:
// dispatch(sampleAction({ id: 1, name: 'Sample Data' }));
