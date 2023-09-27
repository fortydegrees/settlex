import { useContext, createContext } from 'react';

export const BoardContext = createContext({});

export const useBoardContext = () => useContext(BoardContext);