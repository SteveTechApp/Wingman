import AppRoutes from "./AppRoutes";
import { CommandPaletteProvider } from "@/core/wingman/commandPalette/CommandPaletteProvider";

export default function App() {
  return (
    <CommandPaletteProvider>
      <AppRoutes />
    </CommandPaletteProvider>
  );
}