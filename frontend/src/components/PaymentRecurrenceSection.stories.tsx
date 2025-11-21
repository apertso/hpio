import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";

const meta: Meta<typeof PaymentRecurrenceSection> = {
  title: "Sections/PaymentRecurrenceSection",
  component: PaymentRecurrenceSection,
  tags: ["autodocs"],
  argTypes: {
    isSubmitting: { control: "boolean" },
    dueDate: { control: "date" },
    currentRule: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentRecurrenceSection>;

type ComponentProps = React.ComponentProps<typeof PaymentRecurrenceSection>;

type InteractiveProps = Omit<ComponentProps, "onRuleChange"> & {
  dueDate?: Date | number | null;
};

const InteractiveRecurrenceSection = ({
  dueDate,
  currentRule,
  ...rest
}: InteractiveProps) => {
  const [rule, setRule] = useState<string | null>(currentRule ?? null);
  const resolvedDueDate = useMemo(() => {
    if (!dueDate) {
      return undefined;
    }
    if (dueDate instanceof Date) {
      return dueDate;
    }
    const timestamp =
      typeof dueDate === "number" ? dueDate : Date.parse(String(dueDate));
    if (Number.isNaN(timestamp)) {
      return undefined;
    }
    return new Date(timestamp);
  }, [dueDate]);

  return (
    <div className="space-y-4">
      <PaymentRecurrenceSection
        {...rest}
        currentRule={rule ?? undefined}
        dueDate={resolvedDueDate}
        onRuleChange={setRule}
      />
      <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 font-mono text-sm text-gray-700 dark:text-gray-200">
        {rule ?? "Правило не задано"}
      </div>
    </div>
  );
};

export const Playground: Story = {
  args: {
    isSubmitting: false,
    dueDate: new Date(),
    currentRule: null,
  },
  render: (args) => <InteractiveRecurrenceSection {...args} />,
};
