import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  // Add more fields as needed
}

interface Preferences {
  showPhonetics: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  preferences: Preferences;
  signIn: (userData: User) => void;
  signOut: () => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>({
    showPhonetics: false, // Disabled by default
  });

  useEffect(() => {
    // Check for existing session (e.g. in AsyncStorage)
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

  const updatePreferences = (prefs: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, preferences, signIn, signOut, updatePreferences }}>
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
