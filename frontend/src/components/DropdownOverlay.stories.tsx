import type { Meta, StoryObj } from "@storybook/react";
import DropdownOverlay from "./DropdownOverlay";

const meta: Meta<typeof DropdownOverlay> = {
  title: "Components/DropdownOverlay",
  component: DropdownOverlay,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="relative h-48 w-64 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DropdownOverlay>;

export const LeftAligned: Story = {
  args: {
    isOpen: true,
    align: "left",
    widthClass: "w-56",
    children: (
      <div className="p-4 text-gray-800 dark:text-gray-200">
        Dropdown content here. Aligned left.
      </div>
    ),
  },
};

export const RightAligned: Story = {
  args: {
    isOpen: true,
    align: "right",
    widthClass: "w-56",
    children: (
      <div className="p-4 text-gray-800 dark:text-gray-200">
        Dropdown content here. Aligned right.
      </div>
    ),
  },
};
