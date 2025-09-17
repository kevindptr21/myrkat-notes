import { useMyrkat } from '@kevindptr/myrkat-sdk'
import React from 'react'

export const SidebarViewPluginRenderer = () => {
  const { plugins } = useMyrkat()
  const sidebarComponents = plugins
    .getPlugins()
    .map((p) => p.sidebarComponent)
    .filter(Boolean)

  if (sidebarComponents.length === 0) {
    return <div>No sidebar plugins loaded.</div>
  }

  return (
    <>
      {sidebarComponents.map((Component, index) => (
        <React.Fragment key={index}>
          {Component && <Component />}
        </React.Fragment>
      ))}
    </>
  )
}
