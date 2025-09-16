import { useMyrkat } from '@kevindptr/myrkat-sdk'
import React from 'react'

export const MainViewPluginRenderer = () => {
  const { plugins } = useMyrkat()
  const mainComponents = plugins.getMainViewComponents()

  if (mainComponents.length === 0) {
    return <div>No main plugins loaded.</div>
  }

  return (
    <>
      {mainComponents.map(({ id, component: Component }) => (
        <React.Fragment key={id}>
          <Component />
        </React.Fragment>
      ))}
    </>
  )
}
