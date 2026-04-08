
import re

def extract_mapping(file_path):
    mapping = []
    # Pattern to find: ('uuid', 'username', 'email', ...
    # We only need the first UUID and the first Email
    # Simple regex for uuid and email
    uuid_pattern = r"([a-f0-9-]{36})"
    email_pattern = r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if 'INSERT INTO "users"' in line or 'VALUES (' in line:
                # Look for UUID and Email in the same line
                uuids = re.findall(uuid_pattern, line)
                emails = re.findall(email_pattern, line)
                if uuids and emails:
                    mapping.append((uuids[0], emails[0]))
    return mapping

mapping = extract_mapping('migration_bundle_fixed.sql')

# Generate SQL
sql = "-- LEGACY ID MAPPING TABLE\n"
sql += "CREATE TEMP TABLE legacy_id_mapping (old_id UUID, email TEXT);\n"
sql += "INSERT INTO legacy_id_mapping (old_id, email) VALUES \n"

values = []
for old_id, email in mapping:
    values.append(f"('{old_id}', '{email}')")

sql += ",\n".join(values) + ";\n"

with open('repair_mapping.sql', 'w') as f:
    f.write(sql)

print(f"Sucessfully extracted {len(mapping)} user mappings to repair_mapping.sql")
