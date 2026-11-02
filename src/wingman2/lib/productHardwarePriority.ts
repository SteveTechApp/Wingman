import { classifyWingmanProduct, type WingmanProductLike } from "./productClassification";

/**
 * The order a room fills its slots in when two products fit equally.
 *
 * It lives outside `productClassification.ts` because that module is the
 * classifier and this is a ranking preference: the file hit its line ceiling,
 * and the honest split is by job rather than by trimming the reasoning that
 * explains the classes. Nothing in the classifier reads this, so moving it out
 * leaves the dependency pointing one way.
 *
 * A room core before a switcher, a switcher before an extender, a cable last:
 * the ranking exists so a system picks the device that does the most of the job
 * first, and the accessory that completes it rather than instead of it.
 */
export function wingmanHardwareTypePriority(product: WingmanProductLike) {
  const profile = classifyWingmanProduct(product);

  if (profile.productClass === "matrix-switch") return 10;
  if (profile.productClass === "presentation-switcher") return 12;
  if (profile.productClass === "uc-room-core") return 14;
  if (profile.productClass === "avoip-encoder" || profile.productClass === "avoip-decoder" || profile.productClass === "avoip-transceiver") return 16;
  if (profile.productClass === "video-wall-processor" || profile.productClass === "multiview-processor") return 18;
  if (profile.productClass === "signal-extender-kit") return 24;
  if (profile.productClass === "transmitter" || profile.productClass === "receiver") return 28;
  if (profile.productClass === "distribution-amplifier") return 30;
  if (profile.productClass === "hdmi-switcher") return 32;
  if (profile.productClass === "camera" || profile.productClass === "camera-bridge") return 34;
  if (profile.productClass === "audio-amplifier" || profile.productClass === "audio-dsp" || profile.productClass === "control-interface") return 40;
  if (profile.productClass === "cable") return 110;
  if (profile.productClass === "accessory") return 120;

  return 80;
}
