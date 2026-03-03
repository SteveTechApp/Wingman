import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupPage(){
  const nav=useNavigate();
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [company,setCompany]=useState("");

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