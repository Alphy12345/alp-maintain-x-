import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppReloadContext = createContext({ reloadKey: 0, reloadApp: () => {} });

export const AppReloadProvider = ({ children }) => {
  const [reloadKey, setReloadKey] = useState(0);

  const reloadApp = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo(() => ({ reloadKey, reloadApp }), [reloadKey, reloadApp]);

  return <AppReloadContext.Provider value={value}>{children}</AppReloadContext.Provider>;
};

export const useAppReload = () => useContext(AppReloadContext);
