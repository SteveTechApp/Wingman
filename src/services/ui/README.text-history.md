# Text History Feature

Use this for any text input that should remember recent values.

## Service
- src/services/ui/textHistoryService.ts

## Hook
- src/hooks/useTextHistory.ts

## Suggestion component
- src/components/forms/TextHistorySuggestions.tsx

## Example

import * as React from "react";
import { useTextHistory } from "@/hooks/useTextHistory";
import { RECENT_TEXT_HISTORY_KEYS } from "@/services/ui/textHistoryService";
import TextHistorySuggestions from "@/components/forms/TextHistorySuggestions";

export default function Example() {
  const [customer, setCustomer] = React.useState("");
  const { recentValues, saveRecentValue } = useTextHistory(RECENT_TEXT_HISTORY_KEYS.customer);

  return (
    <div>
      <input
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
        onBlur={() => saveRecentValue(customer)}
      />

      <TextHistorySuggestions
        items={recentValues}
        onSelect={(value) => setCustomer(value)}
      />
    </div>
  );
}

## Recommended keys
- customer
- site
- roomName
- manufacturer
- competitorModel
- projectName
- contactName
- consultant
- integrator