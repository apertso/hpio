import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Input,
  TextField,
  EmailField,
  PasswordField,
  NumberField,
  TextInputField,
} from "./Input";

const meta: Meta<typeof TextField> = {
  title: "Components/Input",
  component: TextField,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof TextField>;

export const Primitive: Story = {
  name: "Primitive",
  render: () => (
    <div className="space-y-4 max-w-xl">
      <Input placeholder="you@example.com" />
      <Input placeholder="Disabled input" disabled />
    </div>
  ),
};

export const TextFieldExample: Story = {
  name: "TextField",
  args: {
    label: "Email",
    hint: "Мы отправим подтверждение на указанный адрес.",
    description: "",
    error: "",
    required: true,
  },
  render: (args) => (
    <TextField
      label={args.label}
      hint={args.hint}
      description={args.description}
      error={args.error}
      required={args.required}
      inputId="storybook-textfield"
    >
      <TextField.Input placeholder="you@example.com" />
    </TextField>
  ),
};

export const TextInputFieldExample: Story = {
  name: "TextInputField",
  render: () => (
    <TextInputField
      label="Имя"
      inputId="storybook-textinput"
      placeholder="Иван Иванов"
      required
      hint="Используется для отображения профиля."
    />
  ),
};

export const EmailFieldExample: Story = {
  name: "EmailField",
  render: () => (
    <EmailField
      inputId="storybook-email"
      placeholder="you@example.com"
      required
      hint="Используем для уведомлений."
    />
  ),
};

export const PasswordFieldExample: Story = {
  name: "PasswordField",
  render: () => (
    <PasswordField
      inputId="storybook-password"
      placeholder="********"
      description="Минимум 8 символов."
      required
    />
  ),
};

export const NumberFieldExample: Story = {
  name: "NumberField",
  render: () => (
    <NumberField
      label="Сумма"
      inputId="storybook-amount"
      placeholder="0.00"
      step="0.01"
      required
    />
  ),
};

export const NumberFieldWithSuffix: Story = {
  name: "NumberFieldWithSuffix",
  render: function Render() {
    const [value, setValue] = useState(1);

    return (
      <NumberField
        label="Повторять"
        inputId="storybook-interval"
        value={value}
        min={1}
        onChange={(event) => {
          const nextValue = Math.max(1, parseInt(event.target.value, 10) || 1);
          setValue(nextValue);
        }}
        suffix={value === 1 ? "раз в" : "раза в"}
        required
      />
    );
  },
};
