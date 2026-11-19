# Changelog

## 0.4.0

`assembly-record` 0.4.0, additive: every 0.3.1 record is a valid 0.4.0 record. An assembly type can now state itself as a system type built on a host, as IFC states a wall type with its material layer set:

- `declaredUnit`: the unit one assembly is stated per (a UN/CEFACT Recommendation 20 code), such as FTK for a partition stated per square foot of its face. Every part line's quantity is per one declared unit.
- `listing`: the published design that rates the type (a UL fire-resistance design, a standard designation, an evaluation report or a manufacturer data sheet), by kind and reference. The rated values are `assemblyAttributes` whose basis names the listing.
- A part line's `layer`: the layer it fills, after the IFC material layer: position from face A, IFC layer category, face and thickness.
- A part line's `listedProducts`: the manufacturer products listed for the slot, each by its product key (manufacturer slug and the manufacturer's product identifier), any one of which conforms; the line's `materialDefinitionId` names the generic material the slot calls for.

A new example states a one-hour steel-stud partition with Type X gypsum board per square foot of face, listed against UL design U419.

## 0.3.1

First publication. `assembly-record` 0.3.1: Assembly record, served at `https://openassemblies.org/assembly-record/0.3.1/assembly-record.schema.json`, with its AAS submodel template and its SAMM aspect model (`urn:samm:org.openassemblies.assembly-record:0.3.1`).

assembly-record 0.3.0 was never published. 0.3.1 is 0.3.0 with each reference to a shared definition pinned to that definition's immutable versioned URL, so that what the record accepts cannot change when a shared definition does:

- `https://schemas.ectropy.ai/v/2.0.0/_definitions/units.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/classification-ref.schema.json`
- `https://schemas.ectropy.ai/v/0.1.0/_definitions/file-reference.schema.json`
- `https://schemas.ectropy.ai/v/0.8.0/flow/flow-common.schema.json`

The pinned versions are the ones the unversioned URLs 0.3.0 referred to served on 2026-11-18, so a record valid against 0.3.0 on that date is valid against 0.3.1. Descriptions are worded for publication; nothing else changes.
