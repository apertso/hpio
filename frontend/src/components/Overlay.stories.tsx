import React, { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import Overlay from "./Overlay";

const meta: Meta<typeof Overlay> = {
  title: "Components/Overlay",
  component: Overlay,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Overlay>;

type PositionId =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const positionOptions: Array<{ id: PositionId; label: string }> = [
  { id: "top-left", label: "\u2196" },
  { id: "top-center", label: "\u2191" },
  { id: "top-right", label: "\u2197" },
  { id: "middle-left", label: "\u2190" },
  { id: "center", label: "\u2022" },
  { id: "middle-right", label: "\u2192" },
  { id: "bottom-left", label: "\u2199" },
  { id: "bottom-center", label: "\u2193" },
  { id: "bottom-right", label: "\u2198" },
];

const anchorStyles: Record<PositionId, React.CSSProperties> = {
  "top-left": { top: 24, left: 24 },
  "top-center": { top: 24, left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: 24, right: 24 },
  "middle-left": { top: "50%", left: 24, transform: "translateY(-50%)" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "middle-right": { top: "50%", right: 24, transform: "translateY(-50%)" },
  "bottom-left": { bottom: 24, left: 24 },
  "bottom-center": {
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
  },
  "bottom-right": { bottom: 24, right: 24 },
};

const PlacementPlayground: React.FC = () => {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [buttonPosition, setButtonPosition] = useState<PositionId>("center");
  const [isOpen, setIsOpen] = useState(true);

  const selectedStyle = anchorStyles[buttonPosition];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Button position
          </div>
          <div className="grid w-40 grid-cols-3 gap-1">
            {positionOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`h-10 rounded-md border text-lg transition ${
                  option.id === buttonPosition
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                }`}
                onClick={() => setButtonPosition(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "Hide overlay" : "Show overlay"}
        </button>
      </div>
      <div className="relative h-96 rounded-lg border border-dashed border-gray-400 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <button
          ref={anchorRef}
          type="button"
          className="absolute rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-blue-700"
          style={selectedStyle}
          onClick={() => setIsOpen(true)}
        >
          Trigger
        </button>
        <Overlay
          isOpen={isOpen}
          widthClass="w-48"
          anchorRef={anchorRef}
        >
          <div className="p-4 text-sm text-gray-800 dark:text-gray-100">
            This overlay repositions based on the available viewport space.
          </div>
        </Overlay>
      </div>
    </div>
  );
};

export const InteractivePlacement: Story = {
  render: () => <PlacementPlayground />,
};
