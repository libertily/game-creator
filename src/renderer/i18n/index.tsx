import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import zh from './zh'
import en from './en'
import type { Translations } from './zh'

export type Language = 'zh' | 'en'

const translations: Record<Language, Translations> = { zh, en }

const LanguageContext = createContext<{
  lang: Language
  t: Translations
  setLanguage: (l: Language) => void
}>({
  lang: 'zh',
  t: zh,
  setLanguage: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('gamecreator-lang')
      if (saved === 'en' || saved === 'zh') return saved
    } catch {}
    return 'zh' // 默认中文
  })

  const setLanguage = useCallback((l: Language) => {
    setLang(l)
    try { localStorage.setItem('gamecreator-lang', l) } catch {}
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  return useContext(LanguageContext).t
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  return { lang: ctx.lang, setLanguage: ctx.setLanguage }
}

export { zh, en }
