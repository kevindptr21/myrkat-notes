import { useMyrkat } from '@kevindptr/myrkat-sdk'
import React from 'react'

export const PluginRenderer = () => {
  const { plugins } = useMyrkat()
  const components = plugins
    .getPlugins()
    .map((p) => p.component)
    .filter(Boolean)

  if (components.length === 0) {
    return <div>No main plugins loaded.</div>
  }

  return (
    <>
      {components.map((Component, index) => (
        <React.Fragment key={index}>
          {Component && <Component />}
        </React.Fragment>
      ))}
    </>
  )
}
