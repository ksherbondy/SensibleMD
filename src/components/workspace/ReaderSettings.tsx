import type { RefObject } from "react";

interface ReaderSettingsProps {
  fontScale: number;
  lineHeight: number;
  contentWidth: number;
  reducedMotion: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onFontScaleChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
  onContentWidthChange: (value: number) => void;
  onReducedMotionChange: (value: boolean) => void;
}

export function ReaderSettings({
  fontScale,
  lineHeight,
  contentWidth,
  reducedMotion,
  panelRef,
  onFontScaleChange,
  onLineHeightChange,
  onContentWidthChange,
  onReducedMotionChange,
}: ReaderSettingsProps) {
  return (
    <section
      ref={panelRef}
      className="settings-popover"
      aria-label="Reading settings"
    >
      <label>
        Text size <output>{fontScale}%</output>
        <input
          type="range"
          min="85"
          max="150"
          value={fontScale}
          onChange={(event) => onFontScaleChange(Number(event.target.value))}
        />
      </label>
      <label>
        Line spacing{" "}
        <output>{lineHeight.toFixed(2)}</output>
        <input
          type="range"
          min="1.3"
          max="2.4"
          step="0.05"
          value={lineHeight}
          onChange={(event) =>
            onLineHeightChange(Number(event.target.value))
          }
        />
      </label>
      <label>
        Content width <output>{contentWidth}px</output>
        <input
          type="range"
          min="480"
          max="1040"
          step="20"
          value={contentWidth}
          onChange={(event) =>
            onContentWidthChange(Number(event.target.value))
          }
        />
      </label>
      <label className="toggle-setting">
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => onReducedMotionChange(event.target.checked)}
        />{" "}
        Reduce motion
      </label>
    </section>
  );
}
