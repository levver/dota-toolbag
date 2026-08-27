import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPreferences, UserLeagueProfile, LeagueAdapter } from '../leagues/types';
import { getLeagueAdapter, getLeagueDefinition } from '../leagues/registry';
import { cookies } from '../utils/cookies';
import { storage } from '../utils/storage';

const COOKIE_PREFS_KEY = 'dota_user_prefs';

interface UserContextType {
  activeLeagueId: string | null;
  currentAdapter: LeagueAdapter | null;
  currentProfile: UserLeagueProfile | null;
  preferences: UserPreferences;
  setActiveLeague: (leagueId: string | null) => void;
  updateLeagueProfile: (leagueId: string, profile: Partial<UserLeagueProfile>) => void;
  getLeagueProfile: (leagueId: string) => UserLeagueProfile | null;
  addRecentOpponent: (leagueId: string, captainName: string) => void;
  isLeagueConfigModalOpen: boolean;
  openLeagueConfigModal: () => void;
  closeLeagueConfigModal: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  activeLeagueId: null,
  leagueProfiles: {},
  recentOpponents: {}
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function loadInitialPreferences(): UserPreferences {
  const fromCookie = cookies.get<UserPreferences | null>(COOKIE_PREFS_KEY, null);
  if (fromCookie && typeof fromCookie === 'object') {
    return { ...DEFAULT_PREFERENCES, ...fromCookie };
  }

  const fromStorage = storage.get<UserPreferences | null>(COOKIE_PREFS_KEY, null);
  if (fromStorage && typeof fromStorage === 'object') {
    return { ...DEFAULT_PREFERENCES, ...fromStorage };
  }

  // Migrate legacy Clarity sheet URL if present
  const legacySheet = storage.get<string>('clarity_last_sheet_url', '');
  if (legacySheet) {
    return {
      ...DEFAULT_PREFERENCES,
      leagueProfiles: {
        clarity: {
          division: 1,
          captainName: '',
          sheetUrl: legacySheet
        }
      }
    };
  }

  return DEFAULT_PREFERENCES;
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadInitialPreferences);
  const [isLeagueConfigModalOpen, setIsLeagueConfigModalOpen] = useState(false);

  useEffect(() => {
    cookies.set(COOKIE_PREFS_KEY, preferences, { days: 365 });
    storage.set(COOKIE_PREFS_KEY, preferences);
  }, [preferences]);

  const setActiveLeague = (leagueId: string | null) => {
    setPreferences((prev) => ({
      ...prev,
      activeLeagueId: leagueId
    }));
  };

  const updateLeagueProfile = (leagueId: string, profileUpdate: Partial<UserLeagueProfile>) => {
    setPreferences((prev) => {
      const def = getLeagueDefinition(leagueId);
      const existing = prev.leagueProfiles[leagueId] || {
        division: def?.defaultDivision ?? 1,
        captainName: '',
        sheetUrl: def?.defaultSheetUrl ?? ''
      };

      return {
        ...prev,
        leagueProfiles: {
          ...prev.leagueProfiles,
          [leagueId]: {
            ...existing,
            ...profileUpdate
          }
        }
      };
    });
  };

  const getLeagueProfile = (leagueId: string): UserLeagueProfile | null => {
    const profile = preferences.leagueProfiles[leagueId];
    if (profile) return profile;

    const def = getLeagueDefinition(leagueId);
    if (def) {
      return {
        division: def.defaultDivision,
        captainName: '',
        sheetUrl: def.defaultSheetUrl
      };
    }
    return null;
  };

  const addRecentOpponent = (leagueId: string, captainName: string) => {
    const clean = captainName.trim();
    if (!clean) return;

    setPreferences((prev) => {
      const existing = prev.recentOpponents[leagueId] || [];
      const filtered = existing.filter((c) => c.toLowerCase() !== clean.toLowerCase());
      return {
        ...prev,
        recentOpponents: {
          ...prev.recentOpponents,
          [leagueId]: [clean, ...filtered].slice(0, 8)
        }
      };
    });
  };

  const currentAdapter = getLeagueAdapter(preferences.activeLeagueId);
  const currentProfile = preferences.activeLeagueId
    ? getLeagueProfile(preferences.activeLeagueId)
    : null;

  return (
    <UserContext.Provider
      value={{
        activeLeagueId: preferences.activeLeagueId,
        currentAdapter,
        currentProfile,
        preferences,
        setActiveLeague,
        updateLeagueProfile,
        getLeagueProfile,
        addRecentOpponent,
        isLeagueConfigModalOpen,
        openLeagueConfigModal: () => setIsLeagueConfigModalOpen(true),
        closeLeagueConfigModal: () => setIsLeagueConfigModalOpen(false)
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUserContext(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
