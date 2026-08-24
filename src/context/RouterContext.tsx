import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigate: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getCleanPath = () => {
    if (typeof window === 'undefined') return '/';
    const path = window.location.pathname || '/';
    // Remove trailing slash if length > 1
    return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  };

  const [currentPath, setCurrentPath] = useState<string>(getCleanPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getCleanPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    if (normalized === currentPath) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', normalized);
    setCurrentPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);

export const Link: React.FC<{
  to: string;
  className?: string;
  children: React.ReactNode;
  id?: string;
  onClick?: () => void;
}> = ({ to, className, children, id, onClick }) => {
  const { navigate } = useRouter();

  return (
    <a
      id={id}
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
};
