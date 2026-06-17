import { createContext, useContext, useState } from 'react'

interface NavVisibilityContextValue {
  navHidden: boolean
  setNavHidden: (hidden: boolean) => void
}

const NavVisibilityContext = createContext<NavVisibilityContextValue>({
  navHidden: false,
  setNavHidden: () => {},
})

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [navHidden, setNavHidden] = useState(false)
  return (
    <NavVisibilityContext.Provider value={{ navHidden, setNavHidden }}>
      {children}
    </NavVisibilityContext.Provider>
  )
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext)
}
