// src/utils/builtinIcons.ts

import { builtinIconComponents } from "../components/PaymentIconDisplay";

// Просто массив строк - имен встроенных иконок
export const builtinIcons = Object.keys(builtinIconComponents) as BuiltinIcon[];

export type BuiltinIcon = keyof typeof builtinIconComponents;
// TODO: Добавить больше иконок
// TODO: Реализовать отображение этих иконок на UI (SVG спрайт, компонентная библиотека и т.д.)
// Например, если используете Heroicons, эти строки могут соответствовать именам компонентов: CreditCardIcon, HomeIcon, CarIcon, etc.
