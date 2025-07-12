import type { Meta, StoryObj } from "@storybook/react";
import Scrollbar from "./Scrollbar";
import React from "react";

const meta: Meta<typeof Scrollbar> = {
  title: "Components/Scrollbar",
  component: Scrollbar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Scrollbar>;

const VerticalScrollableContainer: React.FC<{ height?: string }> = ({
  height = "200px",
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className="relative" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 overflow-y-auto pr-3">
        {Array.from({ length: 50 }).map((_, i) => (
          <p
            key={i}
            className="py-2 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
          >
            Scrollable content line {i + 1}
          </p>
        ))}
      </div>
      <Scrollbar containerRef={containerRef} orientation="vertical" />
    </div>
  );
};

const HorizontalScrollableContainer: React.FC<{ width?: string }> = ({
  width = "100%",
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-32" style={{ width }}>
      <div ref={containerRef} className="absolute inset-0 overflow-x-auto pb-3">
        <div className="flex space-x-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-40 h-24 flex-shrink-0 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center"
            >
              <span className="text-blue-800 dark:text-blue-200">
                Item {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Scrollbar containerRef={containerRef} orientation="horizontal" />
    </div>
  );
};

export const Vertical: Story = {
  name: "Vertical Scrollbar",
  render: () => <VerticalScrollableContainer />,
};

export const Horizontal: Story = {
  name: "Horizontal Scrollbar",
  render: () => <HorizontalScrollableContainer />,
};
