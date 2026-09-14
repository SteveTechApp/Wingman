import type { RoomTemplate } from "./roomTemplates";

function publicAssetPath(directory: string, fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  return `${base.endsWith("/") ? base : `${base}/`}${directory}/${fileName}`;
}

export function templateImageFor(template: Pick<RoomTemplate, "id" | "name" | "vertical" | "application" | "scale">): string {
  const text = `${template.id} ${template.name} ${template.vertical} ${template.application} ${template.scale}`.toLowerCase();
  const photo = (fileName: string) => publicAssetPath("template-photos", fileName);

  if (text.includes("multi-camera") || text.includes("camera bridge")) return photo("photo-multicamera-meeting.jpg");
  if (text.includes("huddle") || text.includes("apollo") || text.includes("telemedicine")) return photo("photo-huddle-room.jpg");
  if (text.includes("boardroom") || text.includes("teams room") || text.includes("meeting room")) return photo("photo-boardroom.jpg");
  if (text.includes("school hall") || text.includes("projector")) return photo("photo-school-hall-projector.jpg");
  if (text.includes("classroom")) return photo("photo-classroom.jpg");
  if (text.includes("lecture")) return photo("photo-flexible-learning.jpg");
  if (text.includes("flexible learning") || text.includes("active learning")) return photo("photo-flexible-learning.jpg");
  if (text.includes("hybrid teaching") || text.includes("learning commons") || text.includes("education")) return photo("photo-hybrid-teaching.jpg");
  if (text.includes("pub") || text.includes("8x8 matrix")) return photo("photo-pub-matrix.jpg");
  if (text.includes("sports") || text.includes("bar")) return photo("photo-sportsbar.jpg");
  if (text.includes("casino")) return photo("photo-casino.jpg");
  if (text.includes("bingo")) return photo("photo-bingo.jpg");
  if (text.includes("stadium") || text.includes("concourse") || text.includes("vip")) return photo("photo-stadium.jpg");
  if (text.includes("security command") || text.includes("security operations")) return photo("photo-security-command.jpg");
  if (text.includes("situation") || text.includes("emergency briefing")) return photo("photo-situation-room.jpg");
  if (text.includes("control") || text.includes("operations centre") || text.includes("traffic management")) return photo("photo-control-room.jpg");
  if (text.includes("signage") || text.includes("menu board") || text.includes("patient calling") || text.includes("fids")) return photo("photo-signage.jpg");
  if (text.includes("wall") || text.includes("showroom") || text.includes("experience centre")) return photo("photo-led-wall.jpg");
  if (text.includes("simulation") || text.includes("clinical") || text.includes("healthcare") || text.includes("theatre observation")) return photo("photo-situation-room.jpg");
  if (text.includes("training")) return photo("photo-boardroom.jpg");

  return publicAssetPath("template-visuals", "room-boardroom.jpg");
}
