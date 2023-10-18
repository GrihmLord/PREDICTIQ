// src/redux/reducers/sampleReducer.js
const initialState = {
    // Define your initial state here
  };
  
  const sampleReducer = (state = initialState, action) => {
    if (action.type === 'SAMPLE_ACTION') {
      // Handle the 'SAMPLE_ACTION' here
      // You can explain why there's only one condition for clarity.
      return { ...state, /* update state as needed */ };
    }
  
    // Since this reducer is designed to handle a specific action, it may not need
    // additional conditions. However, you can add more conditions as needed.
  
    return state;
  };
  
  export default sampleReducer;
  