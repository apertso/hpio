import type { Meta, StoryObj } from "@storybook/react";
import RadioButton from "./RadioButton";
import { useState } from "react";

const meta: Meta<typeof RadioButton> = {
  title: "Components/RadioButton",
  component: RadioButton,
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
};

export default meta;

type Story = StoryObj<typeof RadioButton>;

const InteractiveRadioButtons = () => {
  const [selected, setSelected] = useState("option1");
  return (
    <div className="space-y-2">
      <RadioButton
        id="option1"
        name="radio-group"
        value="option1"
        label="Option 1"
        checked={selected === "option1"}
        onChange={(e) => setSelected((e.target as HTMLInputElement).value)}
      />
      <RadioButton
        id="option2"
        name="radio-group"
        value="option2"
        label="Option 2"
        checked={selected === "option2"}
        onChange={(e) => setSelected((e.target as HTMLInputElement).value)}
      />
      <RadioButton
        id="option3"
        name="radio-group"
        value="option3"
        label="Disabled Option"
        checked={false}
        disabled
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveRadioButtons />,
};
