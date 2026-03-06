import * as React from "react";
import type { EngineeringContext, Phase, RoomProfile } from "../types";

export type Rule = {
  id: string;
  phase: Phase;
  priority: number;
  describe: string;
  when: (profile: RoomProfile, ctx: EngineeringContext) => boolean;
  then: (profile: RoomProfile, ctx: EngineeringContext) => void;
  inputsUsed: string[];
};