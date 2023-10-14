import * as React from 'react'

import "./dockStyles.css";


export const Card = ({ src }) => (
  <span className='card'>
    <img className='card__img' src={src} alt="" />
  </span>
)
