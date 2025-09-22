import { createSlice } from '@reduxjs/toolkit';


export interface User {
  _id: string;
  code: string;
  coops: any[];
  createdAt: string;
  email: string;
  id: string;
  language: string;
  lastLogin: string;
  lastName: string;
  name: string;
  phone: string;
  photo: string;
  roles: Array<{
    _id: string;
    createdAt: string;
    image: string;
    modules: any[];
    name: string;
    status: string;
    updatedAt: string;
    visibleMobile: boolean;
  }>;
  status: string;
  type: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
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