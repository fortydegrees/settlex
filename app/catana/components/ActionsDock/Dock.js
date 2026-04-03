import * as React from 'react'
import { animated } from '@react-spring/web'

import "./dockStyles.css";

export const Dock = ({ children }) => {
  return (
    <animated.div className='dock' style={{ x: '-50%' }}>
      {children}
    </animated.div>
  )
}
