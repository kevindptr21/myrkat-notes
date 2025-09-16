import { useMyrkat } from '@kevindptr/myrkat-sdk'
import React from 'react'

export const SidebarViewPluginRenderer = () => {
  const { plugins } = useMyrkat()
  const sidebarComponents = plugins.getSidebarComponents()

  if (sidebarComponents.length === 0) {
    return <div>No sidebar plugins loaded.</div>
  }

  return (
    <>
      {sidebarComponents.map(({ id, component: Component }) => (
        <React.Fragment key={id}>
          <Component />
        </React.Fragment>
      ))}
    </>
  )
}
