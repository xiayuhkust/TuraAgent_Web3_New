"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checkbox = void 0;
const React = __importStar(require("react"));
const CheckboxPrimitive = __importStar(require("@radix-ui/react-checkbox"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (<CheckboxPrimitive.Root ref={ref} className={(0, utils_1.cn)("peer h-4 w-4 shrink-0 rounded-sm border border-zinc-200 border-zinc-900 shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-zinc-900 data-[state=checked]:text-zinc-50 dark:border-zinc-800 dark:border-zinc-50 dark:focus-visible:ring-zinc-300 dark:data-[state=checked]:bg-zinc-50 dark:data-[state=checked]:text-zinc-900", className)} {...props}>
    <CheckboxPrimitive.Indicator className={(0, utils_1.cn)("flex items-center justify-center text-current")}>
      <lucide_react_1.Check className="h-4 w-4"/>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>));
exports.Checkbox = Checkbox;
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
