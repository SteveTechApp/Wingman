export type WingmanShellInput = {
  projectName?: string;
  customer?: string;
  roomType?: string;
  application?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  resolution?: string;
  notes?: string;
  avGuide?: {
    usb?: string;
    audio?: string;
    control?: string;
  };
  videoWall?: {
    wallType?: string;
  };
};