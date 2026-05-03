import struct
import json
import os

def parse_dbf(file_path):
    """
    Minimal pure-Python DBF reader to avoid dependencies.
    """
    records = []
    try:
        with open(file_path, 'rb') as f:
            # Header
            header = f.read(32)
            num_records, header_len, record_len = struct.unpack('<LHH', header[4:12])
            
            # Fields
            num_fields = (header_len - 33) // 32
            fields = []
            for _ in range(num_fields):
                field_data = f.read(32)
                name = field_data[:11].decode('ascii').strip('\x00').strip()
                type = chr(field_data[11])
                length = field_data[16]
                fields.append((name, type, length))
            
            f.read(1) # Terminator
            
            # Records
            for _ in range(num_records):
                record_data = f.read(record_len)
                if not record_data or record_data[0] == ord('*'): # Skip deleted
                    continue
                
                record = {}
                offset = 1
                for name, type, length in fields:
                    value = record_data[offset:offset+length].decode('ascii', errors='ignore').strip()
                    if type == 'N': # Numeric
                        try:
                            value = float(value) if '.' in value else int(value)
                        except:
                            value = 0
                    record[name] = value
                    offset += length
                records.append(record)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    return records

def generate_map():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assess_path = os.path.join(base_dir, "phase2", "L3_SHP_M025_BELLINGHAM", "L3_SHP_M025_Bellingham", "M025Assess_CY25_FY26.dbf")
    lut_path = os.path.join(base_dir, "phase2", "L3_SHP_M025_BELLINGHAM", "L3_SHP_M025_Bellingham", "M025UC_LUT_CY25_FY26.dbf")
    output_path = os.path.join(base_dir, "data", "property_map.json")

    print(f"Loading Assessor Data...")
    assess_data = parse_dbf(assess_path)
    lut_data = parse_dbf(lut_path)

    # Create Use Code Map
    use_code_map = {item['USE_CODE']: item['USE_DESC'] for item in lut_data}

    # Create Address Map
    # Key: "ST_NUM ST_NAME" -> Info
    property_map = {}
    suffixes = [" ST", " RD", " LN", " DR", " AVE", " BLVD", " CT", " PL", " HWY", " CIR", " WAY", " TR", " BV"]
    
    for item in assess_data:
        # Normalize address for lookup
        num = str(item.get('ADDR_NUM', '')).strip().split('.')[0]
        name = str(item.get('FULL_STR', '')).strip().upper()
        
        if not num or not name:
            continue
            
        # Strip suffixes from name for fuzzy matching
        for s in suffixes:
            if name.endswith(s):
                name = name[:-len(s)].strip()
                break
                
        addr_key = f"{num} {name}"
        
        property_map[addr_key] = {
            "type": use_code_map.get(item.get('USE_CODE'), item.get('USE_DESC', 'Other')),
            "year": int(item.get('YEAR_BUILT', 0)) if item.get('YEAR_BUILT') else None,
            "val": float(item.get('TOTAL_VAL', 0))
        }

    # Save
    if not os.path.exists(os.path.dirname(output_path)):
        os.makedirs(os.path.dirname(output_path))
        
    with open(output_path, 'w') as f:
        json.dump(property_map, f, indent=2)
    
    print(f"Property map generated: {len(property_map)} properties mapped to {output_path}")

if __name__ == "__main__":
    generate_map()
