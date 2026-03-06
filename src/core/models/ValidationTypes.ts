import * as React from "react";

export type Confidence="high"|"medium"|"low";

export type ValidationResult={
  valid:boolean;
  warnings:string[];
  blockers:string[];
  confidence:Confidence;
};