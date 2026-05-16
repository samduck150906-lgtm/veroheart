import re
import os

def replace_in_file(filepath, old, new):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def regex_replace(filepath, pattern, repl):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(pattern, repl, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. App.tsx
regex_replace('src/App.tsx', r'(<Route path="success" element={<Success \/>} \/>)', r'{/* \1 */}')
regex_replace('src/App.tsx', r'(<Route path="fail" element={<Fail \/>} \/>)', r'{/* \1 */}')

# 2. supabase.ts
with open('src/lib/supabase.ts', 'r', encoding='utf-8') as f:
    content = f.read()
if content.count('export const signOut =') > 1:
    parts = content.split('export const signOut =')
    content = parts[0] + 'export const signOut =' + parts[1] + '/* duplicate removed */ const _dummySignOut =' + parts[2]
with open('src/lib/supabase.ts', 'w', encoding='utf-8') as f:
    f.write(content)
replace_in_file('src/lib/supabase.ts', 'productUrl: ', '// productUrl: ')

# 3. AdminIngredients.tsx
replace_in_file('src/pages/admin/AdminIngredients.tsx', 'const filteredIngredients =', '// const filteredIngredients =')
replace_in_file('src/pages/admin/AdminIngredients.tsx', '<Input ', '<input ')
replace_in_file('src/pages/admin/AdminIngredients.tsx', '<Select ', '<select ')
replace_in_file('src/pages/admin/AdminIngredients.tsx', '</Select>', '</select>')

# 4. useStore.ts
replace_in_file('src/store/useStore.ts', 'mapProductFromRaw, ', '')
replace_in_file('src/store/useStore.ts', 'mockPetProfile', '{} as any')

print("Applied quick fixes.")
