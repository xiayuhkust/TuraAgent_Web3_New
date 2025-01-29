"use strict";
"use client";
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
exports.Progress = void 0;
const React = __importStar(require("react"));
const ProgressPrimitive = __importStar(require("@radix-ui/react-progress"));
const utils_1 = require("@/lib/utils");
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (<ProgressPrimitive.Root ref={ref} className={(0, utils_1.cn)("relative h-2 w-full overflow-hidden rounded-full bg-zinc-900/20 dark:bg-zinc-50/20", className)} {...props}>
    <ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-zinc-900 transition-all dark:bg-zinc-50" style={{ transform: `translateX(-${100 - (value || 0)}%)` }}/>
  </ProgressPrimitive.Root>));
exports.Progress = Progress;
Progress.displayName = ProgressPrimitive.Root.displayName;
