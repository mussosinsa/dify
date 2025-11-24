'use client'
import type { FC } from 'react'
import React from 'react'
import s from './style.module.css'
import cn from '@/utils/classnames'

export type ILoadingAnimProps = {
  type: 'text' | 'avatar'
}

const LoadingAnim: FC<ILoadingAnimProps> = ({
  type,
}) => {
  return (
    <div className={cn(s.robot, s[type])}>
      <img
        src='/images/chat/robot-waiting.svg'
        alt='Waiting robot'
      />
      <div className={s.glow} />
    </div>
  )
}
export default React.memo(LoadingAnim)
