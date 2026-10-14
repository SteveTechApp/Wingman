import { useSearchParams } from "react-router-dom";
import CompetitorComparePage from "./ComparePageNew.advanced";
import BattleCardsPage from "./BattleCardsPage";

export function ComparePageNew() {
  const [searchParams] = useSearchParams();
  return searchParams.get("mode") === "battle-cards" ? <BattleCardsPage /> : <CompetitorComparePage />;
}

export default ComparePageNew;
