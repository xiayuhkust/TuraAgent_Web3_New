"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toaster = void 0;
const next_themes_1 = require("next-themes");
const sonner_1 = require("sonner");
const Toaster = ({ ...props }) => {
    const { theme = "system" } = (0, next_themes_1.useTheme)();
    return (<sonner_1.Toaster theme={theme} className="toaster group" toastOptions={{
            classNames: {
                toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-950 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-zinc-950 dark:group-[.toaster]:text-zinc-50 dark:group-[.toaster]:border-zinc-800",
                description: "group-[.toast]:text-zinc-500 dark:group-[.toast]:text-zinc-400",
                actionButton: "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50 dark:group-[.toast]:bg-zinc-50 dark:group-[.toast]:text-zinc-900",
                cancelButton: "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-zinc-400",
            },
        }} {...props}/>);
};
exports.Toaster = Toaster;
