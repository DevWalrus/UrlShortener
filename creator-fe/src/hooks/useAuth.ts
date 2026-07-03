import { createContext, useContext } from 'react';

export const AuthContext = createContext<{ handleError: (e: unknown) => void }>({
  handleError: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
