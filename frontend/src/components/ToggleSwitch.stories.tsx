import type { Meta, StoryObj } from "@storybook/react";
import ToggleSwitch from "./ToggleSwitch";
import { useState } from "react";

const meta: Meta<typeof ToggleSwitch> = {
  title: "Components/ToggleSwitch",
  component: ToggleSwitch,
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
};

export default meta;

type Story = StoryObj<typeof ToggleSwitch>;

const InteractiveToggle = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <ToggleSwitch checked={checked} onChange={setChecked} />
      <span className="text-sm">{checked ? "On" : "Off"}</span>
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveToggle />,
};
