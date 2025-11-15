import type { Meta, StoryObj } from "@storybook/react";
import DatePicker, { DatePickerMode } from "./DatePicker";

const meta: Meta<typeof DatePicker> = {
  title: "Components/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["single", "range", "datetime"] as DatePickerMode[],
      description: "Date picker mode",
    },
    label: { control: "text" },
    placeholder: { control: "text" },
    error: { control: "text" },
    disabled: { control: "boolean" },
    required: { control: "boolean" },
    showTimeSelect: { control: "boolean" },
    inline: { control: "boolean" },
    dateFormat: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: "A flexible DatePicker component that supports single date, date range, and date+time selection modes. Automatically adapts to screen size: inline calendar on desktop, slide-panel popup on mobile.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const SingleDate: Story = {
  args: {
    mode: "single",
    label: "Select Date",
    placeholder: "Choose a date",
    dateFormat: "yyyy-MM-dd",
  },
};

export const DateTime: Story = {
  args: {
    mode: "datetime",
    label: "Select Date and Time",
    placeholder: "Choose date and time",
    showTimeSelect: true,
    timeFormat: "HH:mm",
  },
};

export const DateRange: Story = {
  args: {
    mode: "range",
    label: "Select Date Range",
    placeholder: "Choose start and end dates",
  },
};

export const InlineCalendar: Story = {
  args: {
    mode: "single",
    label: "Inline Calendar",
    inline: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Force inline mode regardless of screen size. Desktop will show inline calendar, mobile will show slide panel.",
      },
    },
  },
};

export const WithError: Story = {
  args: {
    mode: "single",
    label: "Date with Error",
    error: "Please select a valid date",
    placeholder: "Choose a date",
  },
};

export const Disabled: Story = {
  args: {
    mode: "single",
    label: "Disabled Date Picker",
    disabled: true,
    placeholder: "Cannot select date",
  },
};

export const Required: Story = {
  args: {
    mode: "single",
    label: "Required Date",
    required: true,
    placeholder: "This field is required",
  },
};

export const WithMinMaxDate: Story = {
  args: {
    mode: "single",
    label: "Date with Constraints",
    placeholder: "Choose a date",
    minDate: new Date(),
    maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  },
};
