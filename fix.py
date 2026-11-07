#!/usr/bin/env python3
with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The problematic line has: "'": ''' which is invalid JS
# Replace with "'": ''' (HTML entity for single quote)
old_pattern = "    \"'\": \"'''\""
new_pattern = '    \"'\": \"'\"'

content = content.replace(old_pattern, new_pattern)

with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replacement done')