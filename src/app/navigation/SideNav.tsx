export default function navClass(isActive:boolean){
  return "wm-snav-item" + (isActive ? " wm-snav-item-active" : "");
}