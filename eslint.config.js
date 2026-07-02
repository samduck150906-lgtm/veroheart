import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 이 설정은 Vite 웹 앱(src/)용이다. 별도 툴체인/런타임을 쓰는 서브프로젝트는 제외:
  //  - landing/            : 자체 .eslintrc 를 가진 Next.js 앱
  //  - react-native-theme/ : React Native 소스(브라우저 globals와 무관)
  //  - scripts/            : Node 데이터 임포트 스크립트
  //  - supabase/functions/ : Deno 엣지 함수
  //  - android/, ios/      : 네이티브 빌드 산출물
  globalIgnores([
    'dist',
    'landing',
    'react-native-theme',
    'scripts',
    'supabase/functions',
    'android',
    'ios',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
