# Changelog

## 0.3.1

First publication. `assembly-record` 0.3.1: Assembly record, served at `https://openassemblies.org/assembly-record/0.3.1/assembly-record.schema.json`, with its AAS submodel template and its SAMM aspect model (`urn:samm:org.openassemblies.assembly-record:0.3.1`).

assembly-record 0.3.0 was never published. 0.3.1 is 0.3.0 with each reference to a shared definition pinned to that definition's immutable versioned URL, so that what the record accepts cannot change when a shared definition does:

- `https://schemas.ectropy.ai/v/2.0.0/_definitions/units.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/classification-ref.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/file-reference.schema.json`
- `https://schemas.ectropy.ai/v/0.8.0/flow/flow-common.schema.json`

The pinned versions are the ones the unversioned URLs 0.3.0 referred to served on 2026-11-18, so a record valid against 0.3.0 on that date is valid against 0.3.1. Descriptions are worded for publication; nothing else changes.
