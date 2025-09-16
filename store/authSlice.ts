import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    storeLogout: (state, action) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }
  },
});

export const { setUser, setToken, setIsAuthenticated, storeLogout } = authSlice.actions;
export default authSlice.reducer;