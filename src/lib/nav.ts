import { createContext, useContext } from 'react'

export type Tab = 'overview' | 'plan' | 'runs' | 'food' | 'progress' | 'sources'

export const NavContext = createContext<(tab: Tab) => void>(() => {})
export const useNav = () => useContext(NavContext)
