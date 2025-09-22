
import authService from '@/services/auth';
import { setIsAuthenticated, setToken, setUser, storeLogout, User } from '@/store/authSlice';
import { RootState } from '@/store/store';
import { useDispatch, useSelector } from 'react-redux';

export function useAuth() {
    const dispatch = useDispatch();
    const { user, token, isAuthenticated } = useSelector((state: RootState) => state.auth) as {
      user: User | null;
      token: string | null;
      isAuthenticated: boolean;
    };

    const login = async (payload: any) => {
        const result = await authService.login(payload);
        if (result && (result.user || result.access_token)) {
            dispatch(setUser(result.user || null));
            dispatch(setToken(result.access_token || null));
            dispatch(setIsAuthenticated(true));
            return result;
        } else {
            dispatch(setIsAuthenticated(false));
            return result;
        }
    };

  const logout = () => {
    dispatch(storeLogout({}));
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  };
}
