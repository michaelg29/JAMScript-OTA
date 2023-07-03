
import json
import sys

TYPE_CONST = "const"
TYPE_ENUM = "enum"
TYPE_STRUCT = "struct"
type_categories = [TYPE_CONST, TYPE_ENUM, TYPE_STRUCT]
type_names = {}
types = {}
schema = {}

def type_not_found_ex(type_name):
    return Exception(f"Type {type_name} not found.")

def parse_primitive_size(type_name: str):
    n = "1"
    if "[" in type_name:
        length_idx = type_name.index("[") + 1
        end_of_length_idx = type_name.index("]")
        n = type_name[length_idx:end_of_length_idx]
        type_name = type_name[0:length_idx - 1]
    
    if n.isdigit():
        n = int(n)
    else:
        if n not in type_names or type_names[n] != TYPE_CONST:
            raise type_not_found_ex(type_name)
        n = types[TYPE_CONST][n]["value"]
    
    if type_name == "char":
        return n * 1
    elif type_name == "short":
        return n * 2
    else: # default to word (4)
        return n * 4

def compute_size(type_name, type_category = None):
    if type_name in type_names:
        # return persisted size
        type_category = type_category if type_category else type_names[type_name]
        if "size" in types[type_category][type_name]:
            return types[type_category][type_name]["size"]
        
        # calculate
        calc_size = 0
        if type_category == TYPE_CONST:
            calc_size = parse_primitive_size(types[TYPE_CONST][type_name]["type"])
        elif type_category == TYPE_ENUM:
            return 4
        elif type_category == TYPE_STRUCT:
            for val in types[TYPE_STRUCT][type_name]["fields"].values():
                calc_size += compute_size(val["type"])

        types[type_category][type_name]["size"] = calc_size
        return calc_size
    
    prim_size = parse_primitive_size(type_name)
    if prim_size == 0:
        type_not_found_ex(type_name)
    
    return prim_size

with open("./schema.json") as schema_in:
    # Load data
    data = json.load(schema_in)

    # =====================
    # ==== Parse types ====
    # =====================

    if "schema" in data:
        schema = data["schema"]
    else:
        print("No schema to generate")
        exit(0)
    
    for type in type_categories:
        types[type] = {}

    def add_type_name(name, type):
        if name in type_names:
            raise Exception(f"Type {name} already defined as {type_names[name]}.")
        type_names[name] = type

    if "types" in data:
        type_categories_to_remove = []
        for category in type_categories:
            if category in data["types"]:
                types[category] = data["types"][category]
                print(types[category])
                for name in types[category]:
                    add_type_name(name, category)
            else:
                type_categories_to_remove.append(category)
        for category in type_categories_to_remove:
            type_categories.remove(category)

    # Compute const sizes
    if TYPE_CONST in types:
        for name in types[TYPE_CONST]:
            compute_size(name, TYPE_CONST)

    # Validate structs and compute sizes
    if TYPE_STRUCT in types:
        for name in types[TYPE_STRUCT]:
            compute_size(name, TYPE_STRUCT)

    # ================================
    # ==== Generate schema images ====
    # ================================

    print("\n\n\nTypes\n\n\n")
    print(json.dumps(types, indent=2))
