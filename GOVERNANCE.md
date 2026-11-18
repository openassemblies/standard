# Governance

Open Assemblies is an open standard for the assembly record. This file says who stewards it, how it changes, and how stewardship moves.

## Steward of record

LuhTech Holdings LLC stewards the standard today. The steward holds the `openassemblies` GitHub organisation, the `openassemblies.org` domain and this repository, and reviews every change (see `.github/CODEOWNERS`).

Stewardship is designed to be handed on. The standard carries nothing that belongs to the steward: no credential, no private dependency, no reference to the steward's other systems. A transfer is a transfer of the organisation and the domain; the repository, its history, its served paths and its licence do not change.

## Roles

- **Steward.** Owns the organisation, approves releases, holds the domain.
- **Maintainers.** Review and merge changes. The `maintainers` team of the `openassemblies` organisation, named in `.github/CODEOWNERS`; the steward sets its membership.
- **Working group.** Anyone who proposes a change by issue or pull request.

## What is in scope

The assembly record: what an assembly is made of, where each part sits in it and how a bent part is bent, how it is identified and classified, the values of its properties with their basis, the job that produced it, and the files it is made from. The record names the published standards it relates to (ISA-95, IEC 61406, the IDTA submodel templates, IFC, ETIM, UN/CEFACT Recommendation 20) by identifier.

Not in scope: any tool, platform or product; how any one party designs, prices, schedules or decides.

## How a change lands

1. Open an issue stating the change and why. A correction to a definition is a change.
2. Open a pull request. Commits carry a Developer Certificate of Origin sign-off (`git commit -s`).
3. CI must pass: canonical form, `$id` equals the served URL, closure under `https://openassemblies.org/` and the pinned shared definitions, every schema compiles, every example validates, public text clean, published versions immutable, and the generated files match the aspect model.
4. A maintainer reviews. The default branch takes squash merges only, linear history, no force pushes.

## Versions

- The **record** carries a semantic version, named in its aspect model's URN and in its served path. A version, once published, never changes: new content is a new version at a new path, and every published version stays served.
- A **release** is a git tag `vX.Y.Z` on the default branch. The served site is rebuilt from the default branch on every merge.

## Licence, name and mark

The aspect models, schemas, templates and examples are licensed under the Apache License, Version 2.0 (see `LICENSE` and `NOTICE`). The name "Open Assemblies" is held by the steward of record and transfers with stewardship. Anyone may say that a tool or a process implements Open Assemblies, naming the versions it implements; no one may use the name to state or suggest that the steward endorses or certifies a product, a firm or a site.

## Transfer of stewardship

When a standards body or consortium takes the standard on:

1. The incoming steward is added as an owner of the `openassemblies` GitHub organisation; the outgoing steward removes itself.
2. The `openassemblies.org` registration and DNS move to the incoming steward.
3. The incoming steward sets the `maintainers` team's membership. This file and `NOTICE` are updated in one pull request that names the date of transfer; `CODEOWNERS` does not change.
4. Nothing else changes: `$id`s, served paths, versions and the licence stay as they are.
