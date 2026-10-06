import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TechnicalSchematic } from "./TechnicalSchematic";
import { buildHdbasetPresentationSchematic } from "../lib/schematic/hdbasetPresentationSchematic";
import { downloadBlob } from "../lib/downloadBlob";
vi.mock("../lib/downloadBlob",()=>({downloadBlob:vi.fn()}));
vi.mock("./DiagramViewport",()=>({DiagramViewport:({children,actions}:{children:React.ReactNode;actions:React.ReactNode})=><div>{actions}{children}</div>}));
const model=buildHdbasetPresentationSchematic({title:"School hall",products:[{sku:"SW-130-TX-UK"},{sku:"RX-700"}],sources:[{label:"PC HDMI"}],displays:[{label:"Projector"}]})!;
describe("technical drawing output",()=>{
  it("exports a self-contained SVG with named ports and the receiver in the path",async()=>{
    render(<TechnicalSchematic model={model}/>);
    fireEvent.click(screen.getByRole("button",{name:"Export SVG"}));
    const blob=vi.mocked(downloadBlob).mock.calls.at(-1)![0];
    const xml=await new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsText(blob);});
    expect(blob.type).toBe("image/svg+xml");
    expect(xml).toContain("RX-700");
    expect(xml).toContain("HDBT IN");
    expect(xml).toContain("CABLE / CONNECTION SCHEDULE");
    expect(xml).not.toContain("foreignObject");
    expect(new DOMParser().parseFromString(xml,"image/svg+xml").querySelector("parsererror")).toBeNull();
  });
  it("saves the same technical sheet to a project as a portable SVG data URL",async()=>{
    const save=vi.fn(); render(<TechnicalSchematic model={model} onSaveAsset={save}/>);
    fireEvent.click(screen.getByRole("button",{name:"Save to project"}));
    await waitFor(()=>expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].svg).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(save.mock.calls[0][0].width).toBeGreaterThan(1000);
  });
});
