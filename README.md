# Open Assemblies standard

An open standard for the assembly record: one assembly type or assembly instance: how it is identified, its classes in published systems, the parts it is made of with their quantities and each placed occurrence of them -- with a bent part's bends -- its occurrence property values with their basis, the job that produced it, and the files it is made from. This repository is the standard's definition: a SAMM aspect model, and the JSON Schema (draft-07) and Asset Administration Shell submodel template generated from it.

- **Served:** each version of the schema at its `$id` under `https://openassemblies.org/`, its AAS template and aspect model beside it, and [`index.json`](https://openassemblies.org/index.json) listing them.
- **Licence:** Apache License 2.0 (`LICENSE`, `NOTICE`).
- **Governance:** `GOVERNANCE.md`. Contributions: `CONTRIBUTING.md`.
- **Status:** draft. No version 1.0.0 schema has been released yet.

## What is here

| Path | What it is |
|---|---|
| `samm/org.openassemblies.assembly-record/{version}/AssemblyRecord.ttl` | The assembly record as an Eclipse Semantic Aspect Meta Model (SAMM 2.1.0) aspect model, aspect `urn:samm:org.openassemblies.assembly-record:{version}#AssemblyRecord`. It is the source: the two files below are generated from it. |
| `assembly-record/{version}/assembly-record.schema.json` | The assembly record's JSON Schema (draft-07), served at its `$id`, `https://openassemblies.org/assembly-record/{version}/assembly-record.schema.json`. |
| `assembly-record/{version}/assembly-record.aas.json` | The assembly record's Asset Administration Shell submodel template (IDTA 01001 metamodel, JSON). |
| `references.json` | The shared definitions the record refers to outside its own namespace, each at an immutable versioned URL with its SHA-256. |
| `examples/` | Example records, listed in `examples/manifest.json` against the schema each validates with. |
| `scripts/` | The gate (`npm run check`), the served-site build (`npm run site`), the served check (`npm run served`) and the generator that writes the schema and AAS template from the aspect model. |

## How the record is built

An assembly record states one assembly type (`assetKind` Type) or one assembly instance. `identity` is its IEC 61406 identification link, the AAS globalAssetId it resolves to, and its serial number and lot. `classification` names its classes in published systems: the IFC element assembly and the CCI functional class. `hasPart` lists the parts it is made of, each by its ISA-95 material definition identifier, with quantity, unit and basis after the Catena-X quantity semantics of IDTA 02011; a bulk-counted part carries no quantity. A part line carries one occurrence per counted unit: where the part's base-form frame sits in the assembly's frame (location, axis and reference direction, with the length unit), the values of any base-form dimension that varies by occurrence, such as a rod's cut length, and, for a bent part, its bends in order: the straight before each, the rotation of its plane, its angle and its centreline radius, and the straight after the last. `assemblyAttributes`, `manufacturerOccurrence`, `constructionOccurrence` and `installationOccurrence` hold the values of the IFC property sets of those names; `process` is the ISA-95 job order and job response that produced the assembly; `status` its lifecycle status; `fabricationFiles` its geometry and machining files; and `provenance` who authored the record, when, from which sources, and whether it is illustrative.

Every unit is a UN/CEFACT Recommendation 20 code. Classes are named in published systems (ETIM, IFC, CCI, read through the buildingSMART Data Dictionary) by code, version and URI. Every value carries its basis: measured, derived (with its method), a default (with its source) or substituted. A file the record depends on (an ISO 10303-242 or ISO 10303-238 model, a DSTV file) is referenced by URI and SHA-256, never embedded.

## Shared definitions

A unit of measure, a quantity, a classification reference, a file reference and the basis of a value are not defined here: the record refers to shared, openly published definitions at an immutable versioned URL each, listed in `references.json`:

- `https://schemas.ectropy.ai/v/2.0.0/_definitions/units.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/classification-ref.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/file-reference.schema.json`
- `https://schemas.ectropy.ai/v/0.8.0/flow/flow-common.schema.json`

A versioned URL never changes, so neither does what a version of this record accepts. The check fetches each one, refuses it unless its bytes match the pinned SHA-256, and validates the examples against it.

## What is not here

A modelling tool, a fabrication planner or a product catalogue. Any one party's way of designing, pricing, scheduling or deciding. The standard names the published standards it relates to (ISA-95, IEC 61406, the IDTA submodel templates, IFC, ETIM, UN/CEFACT Recommendation 20) by their identifiers; it does not reproduce them.

## Using the standard

- **A version:** fetch `https://openassemblies.org/assembly-record/{version}/assembly-record.schema.json`. A published version's bytes never change; new content is a new version at a new path.
- **Vendored:** copy this repository at a commit or a release tag.

## Working on it

```sh
npm ci
npm run check
npm run site
```

The gate holds: canonical form, `$id` equals the served URL and names the record's version, closure under `https://openassemblies.org/` and the pinned shared definitions, every schema compiles, every example validates and holds together, public text clean, published versions immutable.

The schema and the AAS template are generated, never edited by hand. Change the aspect model, as a new version under `samm/org.openassemblies.assembly-record/`, and regenerate with the Eclipse ESMF SAMM CLI 2.16.0 (Java 25):

```sh
npm run generate -- java -jar samm-cli-2.16.0.jar
```

CI regenerates both from the aspect model and fails when they differ from what is committed.
