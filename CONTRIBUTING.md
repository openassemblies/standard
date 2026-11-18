# Contributing

Thank you for working on the standard. The rules below keep every change checkable.

## Before you start

- Open an issue describing the change. Reference the record and version it touches.
- Read `GOVERNANCE.md` for scope, roles and how a change lands.

## Working on a change

```sh
npm ci
npm run check   # the gate CI runs
npm run site    # stages _site/ as the served site would be
```

- The aspect model under `samm/` is the source. The JSON Schema and the AAS submodel template are generated from it with the Eclipse ESMF SAMM CLI (`npm run generate -- java -jar samm-cli-2.16.0.jar`) and never edited by hand; CI regenerates them and fails on any difference.
- A change to the record is a new version: a new directory `samm/org.openassemblies.assembly-record/{version}/` holding the changed aspect model, and the generated `assembly-record/{version}/`. A published version's files never change and are never removed.
- Schemas are JSON Schema draft-07, in canonical form: two-space indentation, UTF-8, a trailing newline. A schema's `$id` is its served URL: `https://openassemblies.org/assembly-record/{version}/assembly-record.schema.json`.
- A `$ref` stays in `https://openassemblies.org/` or names a shared definition at its versioned URL, listed in `references.json` with its SHA-256. An unversioned URL of another publisher is refused.
- Every example is listed in `examples/manifest.json` against the schema it validates with.
- Public text says what a definition is. It names no steward-internal system, path, ticket or work order.

## Commits and pull requests

- Sign off every commit (`git commit -s`) to certify the Developer Certificate of Origin (https://developercertificate.org/).
- One pull request per change. The default branch takes squash merges only.
- CI must be green before merge.

## Reporting a security problem

See `SECURITY.md`.
