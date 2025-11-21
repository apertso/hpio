import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import SegmentedControl, {
  type SegmentedControlOption,
  type TimeRangeOption,
} from "./SegmentedControl";

const meta: Meta<typeof SegmentedControl> = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
};

export default meta;

type Story = StoryObj<typeof SegmentedControl>;

const defaultOptions: SegmentedControlOption<TimeRangeOption>[] = [
  { value: "1d", label: "1 день" },
  { value: "1w", label: "1 неделя" },
  { value: "1m", label: "1 месяц" },
  { value: "1y", label: "1 год" },
  { value: "custom", label: "Произвольно" },
];

export const Default: Story = {
  args: {
    options: defaultOptions,
  },
  render: (args) => {
    const [selected, setSelected] = useState<TimeRangeOption>("1d");

    return (
      <SegmentedControl
        {...args}
        selected={selected}
        onChange={(value) => {
          setSelected(value);
          args.onChange?.(value);
        }}
      />
    );
  },
};

