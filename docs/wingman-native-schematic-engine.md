# Wingman native schematic engine

This module creates Wingman-native AV schematic models without importing third-party schematic source code.

## Purpose

The engine turns a Wingman project brief into a structured schematic model containing:

- devices and system nodes;
- signal paths for video, USB, audio, network, control and power;
- proposal-safe assumptions;
- warnings where the design needs validation;
- BOM dependency hints such as NHD-CTL-PRO for NetworkHD systems.

## Design principle

Wingman decides the AV architecture. The schematic engine draws that architecture.

EasySchematic can be used as a reference for canvas and connection behaviour, but WyreStorm product logic, proposal safety and BOM dependencies remain native to Wingman.

## Core files

- `src/wingman2/lib/schematic/schematicTypes.ts`
- `src/wingman2/lib/schematic/schematicProductRules.ts`
- `src/wingman2/lib/schematic/schematicLayoutEngine.ts`
- `src/wingman2/lib/schematic/wingmanSchematicEngine.ts`
- `src/wingman2/lib/schematic/wingmanSchematicEngine.test.ts`

## Integration target

Visual Design Studio should consume `SchematicModel` and render:

- nodes as editable device cards;
- connections as labelled signal paths;
- warnings as quote-readiness checks;
- BOM hints as proposal dependencies.

## Safety rules

The engine must not claim connector types unless evidence exists. Unknown or inferred source connections should use terms such as local source, room source, customer device or UC device.

NetworkHD systems should include controller and network dependency checks. Mixed NetworkHD series should be warned, not silently combined.