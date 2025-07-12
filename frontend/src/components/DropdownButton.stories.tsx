import type { Meta, StoryObj } from "@storybook/react";
import { DropdownButton } from "./DropdownButton";
import {
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";

const meta: Meta<typeof DropdownButton> = {
  title: "Components/DropdownButton",
  component: DropdownButton,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "200px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DropdownButton>;

const commonOptions = [
  {
    label: "Edit",
    onClick: () => {},
    icon: <PencilIcon className="h-4 w-4" />,
  },
  {
    label: "Archive",
    onClick: () => {},
    icon: <ArchiveBoxIcon className="h-4 w-4" />,
  },
  {
    label: "Delete",
    onClick: () => {},
    icon: <TrashIcon className="h-4 w-4" />,
  },
];

export const Default: Story = {
  args: {
    label: "Actions",
    options: commonOptions,
  },
};

export const LongList: Story = {
  args: {
    label: "Select Item",
    options: Array.from({ length: 15 }, (_, i) => ({
      label: `Item ${i + 1}`,
      onClick: () => {},
    })),
  },
};
