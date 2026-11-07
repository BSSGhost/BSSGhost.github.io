with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic triple single quote with HTML entity
old = "    '&': '&', '<': '<', '>': '>', \"'\": '''\"
new = '    \"&\": \"&\", \"<\": \"<\", \">\": \">\", \"\\\"\": \"\\\"\", \"'\": \"'\"'

content = content.replace(old, new)

with open('C:\\Users\\BSS_Ghost\\Documents\\CalculMoyenne\\admin/js\\students.import.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Replacement done')