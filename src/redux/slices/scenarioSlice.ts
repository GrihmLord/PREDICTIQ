// src/redux/slices/scenarioSlice.ts
// Redux Toolkit slice for scenario management

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Scenario {
    id: string;
    title: string;
    description: string;
    category: string;
    parameters: Record<string, number | string | boolean>;
    probability: number;
    createdAt: string;
    updatedAt: string;
}

interface ScenariosState {
    scenarios: Scenario[];
    currentScenario: Scenario | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: ScenariosState = {
    scenarios: [],
    currentScenario: null,
    isLoading: false,
    error: null,
};

const scenarioSlice = createSlice({
    name: 'scenarios',
    initialState,
    reducers: {
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
        addScenario(state, action: PayloadAction<Scenario>) {
            state.scenarios.unshift(action.payload);
        },
        updateScenario(state, action: PayloadAction<Scenario>) {
            const index = state.scenarios.findIndex(s => s.id === action.payload.id);
            if (index !== -1) {
                state.scenarios[index] = action.payload;
            }
        },
        deleteScenario(state, action: PayloadAction<string>) {
            state.scenarios = state.scenarios.filter(s => s.id !== action.payload);
        },
        setCurrentScenario(state, action: PayloadAction<Scenario | null>) {
            state.currentScenario = action.payload;
        },
        setScenarios(state, action: PayloadAction<Scenario[]>) {
            state.scenarios = action.payload;
        },
    },
});

export const {
    setLoading,
    setError,
    addScenario,
    updateScenario,
    deleteScenario,
    setCurrentScenario,
    setScenarios,
} = scenarioSlice.actions;

export default scenarioSlice.reducer;
