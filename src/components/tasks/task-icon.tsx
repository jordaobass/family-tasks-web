import { FC } from 'react'
import Image from 'next/image'
import { TaskIconProps } from '@/types'
import { cn } from '@/lib/utils'

export const TaskIcon: FC<TaskIconProps> = ({ 
  icon_type, 
  icon_value,
  size = 'medium',
  className
}) => {
  const get_icon_content = () => {
    switch (icon_type) {
      case 'emoji':
        return <span className="select-none">{icon_value}</span>
      case 'image':
        return (
          <Image
            src={icon_value}
            alt=""
            fill
            className="object-cover rounded"
          />
        )
      case 'font_awesome':
        return <i className={`fa ${icon_value}`} />
      default:
        return <span className="select-none">📋</span>
    }
  }

  const size_classes = {
    small: 'w-6 h-6 text-sm',
    medium: 'w-12 h-12 text-2xl',
    large: 'w-16 h-16 text-4xl'
  }

  return (
    <div className={cn(
      'flex items-center justify-center flex-shrink-0 relative',
      size_classes[size],
      className
    )}>
      {get_icon_content()}
    </div>
  )
}