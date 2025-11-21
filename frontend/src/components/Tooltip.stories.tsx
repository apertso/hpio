import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "./Tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "Components/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  argTypes: {
    content: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

const StoryContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-64 items-center justify-center bg-gray-50 dark:bg-gray-900">
    {children}
  </div>
);

export const Default: Story = {
  args: {
    content: "Click the icon to learn more about this action.",
  },
  render: (args) => (
    <StoryContainer>
      <Tooltip {...args}>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-blue-700"
        >
          Info
        </button>
      </Tooltip>
    </StoryContainer>
  ),
};

export const WithLongContent: Story = {
  args: {
    content:
      "Tooltips support longer descriptions. Swipe horizontally on mobile or click outside to dismiss this message.",
  },
  render: (args) => (
    <StoryContainer>
      <Tooltip {...args}>
        <span className="cursor-pointer rounded-lg border border-dashed border-gray-400 px-5 py-3 text-sm font-medium text-gray-700 dark:border-gray-500 dark:text-gray-100">
          Need details?
        </span>
      </Tooltip>
    </StoryContainer>
  ),
};
