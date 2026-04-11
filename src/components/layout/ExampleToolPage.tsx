import WingmanPageFrame, { WingmanPageSection } from "@/components/layout/WingmanPageFrame";

export default function ExampleToolPage() {
  return (
    <WingmanPageFrame
      eyebrow="Wingman"
      title="Page title"
      subtitle="Every page should use this same structure. Only the content inside the sections should change."
      actions={
        <>
          <button className="wm-btn wm-btn--subtle">Secondary</button>
          <button className="wm-btn wm-btn--primary">Primary</button>
        </>
      }
    >
      <WingmanPageSection
        title="Primary workspace"
        subtitle="Main task content goes here."
      >
        <div>Tool content</div>
      </WingmanPageSection>

      <WingmanPageSection
        title="Supporting information"
        subtitle="Reference, status, or detail blocks go here."
      >
        <div>Secondary content</div>
      </WingmanPageSection>
    </WingmanPageFrame>
  );
}