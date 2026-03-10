import React from "react"
import WorkflowBoard from "@/features/workflow/WorkflowBoard"

export default function DashboardPage(){

  return (
    <div className="wm-dashboard">

      <div className="wm-dashboard-header">
        <h1>Project Workflow</h1>
        <p>Track every AV opportunity from discovery to proposal.</p>
      </div>

      <WorkflowBoard/>

    </div>
  )

}