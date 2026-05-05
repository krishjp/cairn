import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  name: string;
  // Add more fields as needed
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session (e.g. in AsyncStorage)
    // For now we'll just simulate a check
    const checkAuth = async () => {
      try {
        // Simulate local storage check
        setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signIn = (userData: User) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
