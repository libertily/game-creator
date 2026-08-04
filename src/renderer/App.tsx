import React from 'react'
import { LanguageProvider } from './i18n'
import { useEditorStore } from './stores/editorStore'
import MainLayout from './components/layout/MainLayout'
import ProjectManager from './components/project/ProjectManager'

const AppInner: React.FC = () => {
  const project = useEditorStore((s) => s.project)
  if (!project) return <ProjectManager />
  return <MainLayout />
}

const App: React.FC = () => (
  <LanguageProvider>
    <AppInner />
  </LanguageProvider>
)

export default App
