import type { Meta, StoryObj } from "@storybook/react";
import { YearSelectorDropdown } from "./YearSelectorDropdown";
import { useState } from "react";

const meta: Meta<typeof YearSelectorDropdown> = {
  title: "Components/YearSelectorDropdown",
  component: YearSelectorDropdown,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "250px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof YearSelectorDropdown>;

const StorybookYearSelector: React.FC = () => {
  const [year, setYear] = useState(2024);
  const years = Array.from({ length: 21 }, (_, i) => 2014 + i);
  return (
    <YearSelectorDropdown
      years={years}
      selectedYear={year}
      onChange={setYear}
    />
  );
};

export const Default: Story = {
  render: () => <StorybookYearSelector />,
};
