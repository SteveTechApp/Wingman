import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function SignupPage(){
  const nav=useNavigate();
  const [email,setEmail]=React.useState("");
  const [name,setName]=React.useState("");
  const [company,setCompany]=React.useState("");

  const onSubmit=(e:any)=>{
    e.preventDefault();
    localStorage.setItem("wingman_user_email",email||"");
    localStorage.setItem("wingman_user_company",company||"");
    nav("/app/dashboard",{replace:true});
  };

  return (
    <form onSubmit={onSubmit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
      <button type="submit">Continue</button>
    </form>
  );
}