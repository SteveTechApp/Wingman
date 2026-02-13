
import {Outlet} from "react-router-dom";

export default function PublicShell(){
 return(
  <div className="ws-app wm-density-compact">
   <main className="ws-page wm-density-compact wm-container wm-page">
    <Outlet/>
   </main>
  </div>
 )
}


