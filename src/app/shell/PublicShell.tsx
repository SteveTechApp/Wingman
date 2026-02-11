
import {Outlet} from "react-router-dom";

export default function PublicShell(){
 return(
  <div className="ws-app">
   <main className="ws-page">
    <Outlet/>
   </main>
  </div>
 )
}


