import { installWingmanFormFieldIdentityGuard } from "./wingman2/utils/installWingmanFormFieldIdentityGuard";

import { installWingmanLocalProjectApiFallback } from "./wingman2/utils/installWingmanLocalProjectApiFallback";

import React from "react";

import { createRoot } from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import AppRoot from "./wingman2/app/WingmanApp";

import { installWingmanVisualIdentity } from "./wingman2/utils/installWingmanVisualIdentity";

import { installWingmanSalesMode } from "./wingman2/utils/installWingmanSalesMode";

import { installWingmanPerformanceGuards } from "./wingman2/utils/installWingmanPerformanceGuards";

import { installWingmanAuthoritySystem } from "./wingman2/utils/installWingmanAuthoritySystem";

import "./wingman2/styles/wingman-style-stack.css";

import { installDiscoveryOutputPreviewEnhancer } from "./wingman2/discovery/outputPreviewEnhancer";



import { installWingmanVisualRouteFlags } from "./wingman2/theme/wingmanVisualRouteFlags";



installWingmanVisualRouteFlags();



installDiscoveryOutputPreviewEnhancer();



installWingmanVisualIdentity();

installWingmanSalesMode();



const rootElement = document.getElementById("root");

if (!rootElement) {

  throw new Error("Root element #root was not found.");

}



installWingmanLocalProjectApiFallback();

installWingmanPerformanceGuards();

installWingmanAuthoritySystem();

installWingmanFormFieldIdentityGuard();



createRoot(rootElement).render(

  <React.StrictMode>

    <BrowserRouter>

      <AppRoot />

    </BrowserRouter>

  </React.StrictMode>

);



