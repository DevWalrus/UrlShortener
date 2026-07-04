import { createContext, useContext } from 'react';

export const AuthContext = createContext<{
  forbidden: boolean
  handleError: (e: unknown) => void
}>({
  forbidden: false,
  handleError: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
