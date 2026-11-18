#!/usr/bin/env python3
"""Generate the record's JSON Schema (draft-07) and AAS submodel template from its SAMM aspect model, with the
Eclipse ESMF SAMM CLI, for every version under samm/{namespace}/{version}/.

The CLI's JSON Schema is put in the standard's form: draft-07, $id at https://openassemblies.org/{record}/{version}/,
components moved to definitions, and the entities and characteristics named in BINDINGS replaced by $refs to
the shared definitions at their pinned, versioned URLs. The AAS template is written as the CLI emits it.

Usage: python3 scripts/generate.py <samm-cli command...>            write the generated files
       python3 scripts/generate.py --check <samm-cli command...>    exit 1 if a committed file differs
<samm-cli command> is how to run the CLI, e.g. `java -jar samm-cli-2.16.0.jar`. Run from the repository root."""
import difflib, glob, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARED = "https://schemas.ectropy.ai/v/"
UNITS = SHARED + "2.0.0/_definitions/units.schema.json"
CLASSIFICATION = SHARED + "0.1.0/_definitions/classification-ref.schema.json"
FILE_REFERENCE = SHARED + "0.1.0/_definitions/file-reference.schema.json"
FLOW_COMMON = SHARED + "0.8.0/flow/flow-common.schema.json"
BINDINGS = {
    "ClassificationReference": CLASSIFICATION,
    "FileReference": FILE_REFERENCE,
    "Basis": FLOW_COMMON + "#/definitions/basis",
    "BasisCharacteristic": FLOW_COMMON + "#/definitions/basis",
    "UnitOfMeasure": UNITS + "#/definitions/uom",
    "Quantity": UNITS + "#/definitions/quantity",
    "QuantityCharacteristic": UNITS + "#/definitions/quantity",
    "FileReferenceCharacteristic": FILE_REFERENCE,
}
RECORD = "assembly-record"
NAMESPACE = "org.openassemblies.assembly-record"
BASE = "https://openassemblies.org/" + RECORD + "/"


def run(cli, *args):
    r = subprocess.run(cli + list(args), capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"samm-cli {' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")


def components(schema):
    """The CLI's shared subschemas and the JSON pointer prefix its $refs use."""
    if isinstance(schema.get("components"), dict) and isinstance(schema["components"].get("schemas"), dict):
        return schema["components"].pop("schemas"), "#/components/schemas/"
    for key in ("$defs", "definitions"):
        if isinstance(schema.get(key), dict):
            return schema.pop(key), f"#/{key}/"
    return {}, None


def bound(name):
    for local, target in BINDINGS.items():
        if name == local or name.endswith("_" + local):
            return target
    return None


def shape(raw, schema_id, version, title):
    comps, prefix = components(raw)
    raw.pop("components", None)
    defs = {}
    for name, sub in comps.items():
        short = name.rsplit("_", 1)[-1]
        target = bound(name)
        defs[short] = {"$ref": target} if target else sub
        if not target and sub.get("type") == "object" and "properties" in sub:
            sub.setdefault("additionalProperties", False)

    def rewrite(o):
        if isinstance(o, dict):
            if prefix and isinstance(o.get("$ref"), str) and o["$ref"].startswith(prefix):
                o["$ref"] = "#/definitions/" + o["$ref"][len(prefix):].rsplit("_", 1)[-1]
            for v in o.values():
                rewrite(v)
        elif isinstance(o, list):
            for v in o:
                rewrite(v)

    rewrite(raw)
    rewrite(defs)
    out = {"$schema": "http://json-schema.org/draft-07/schema#", "$id": schema_id, "title": title,
           "version": version}
    for k, v in raw.items():
        if k not in ("$schema", "$id", "title"):
            out[k] = v
    if out.get("type") == "object":
        out.setdefault("additionalProperties", False)
    out["definitions"] = dict(sorted(defs.items()))
    return out


def generate(cli, out_dir):
    written = []
    for version_dir in sorted(glob.glob(os.path.join(ROOT, "samm", NAMESPACE, "*"))):
        ttl = glob.glob(os.path.join(version_dir, "*.ttl"))
        if len(ttl) != 1:
            sys.exit(f"{version_dir}: expected one aspect model, found {ttl}")
        ttl = ttl[0]
        version = os.path.basename(version_dir)
        target = os.path.join(out_dir, RECORD, version)
        os.makedirs(target, exist_ok=True)
        run(cli, "aspect", ttl, "validate")
        with tempfile.TemporaryDirectory() as tmp:
            raw_path = os.path.join(tmp, "raw.schema.json")
            run(cli, "aspect", ttl, "to", "schema", "-o", raw_path)
            raw = json.load(open(raw_path))
        title = re.sub(r"(?<!^)(?=[A-Z])", " ", os.path.splitext(os.path.basename(ttl))[0])
        schema = shape(raw, f"{BASE}{version}/{RECORD}.schema.json", version, title)
        sp = os.path.join(target, f"{RECORD}.schema.json")
        open(sp, "w").write(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
        ap = os.path.join(target, f"{RECORD}.aas.json")
        run(cli, "aspect", ttl, "to", "aas", "--format", "json", "-o", ap)
        written += [sp, ap]
    return written


def main():
    args = sys.argv[1:]
    check = bool(args) and args[0] == "--check"
    cli = args[1:] if check else args
    if not cli:
        sys.exit(__doc__.split("Usage: ")[1])
    if not check:
        for p in generate(cli, ROOT):
            print("wrote", os.path.relpath(p, ROOT))
        return 0
    with tempfile.TemporaryDirectory() as tmp:
        drift = 0
        for p in generate(cli, tmp):
            rel = os.path.relpath(p, tmp)
            committed = os.path.join(ROOT, rel)
            new = open(p).read().splitlines()
            old = open(committed).read().splitlines() if os.path.exists(committed) else []
            if new != old:
                drift += 1
                print(f"DRIFT {rel}")
                print("\n".join(list(difflib.unified_diff(old, new, "committed", "generated", lineterm=""))[:40]))
        print("generated files match the aspect models" if not drift else f"{drift} generated file(s) differ")
        return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(main())
