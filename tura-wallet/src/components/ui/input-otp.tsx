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
exports.InputOTPSeparator = exports.InputOTPSlot = exports.InputOTPGroup = exports.InputOTP = void 0;
const React = __importStar(require("react"));
const input_otp_1 = require("input-otp");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => (<input_otp_1.OTPInput ref={ref} containerClassName={(0, utils_1.cn)("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)} className={(0, utils_1.cn)("disabled:cursor-not-allowed", className)} {...props}/>));
exports.InputOTP = InputOTP;
InputOTP.displayName = "InputOTP";
const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={(0, utils_1.cn)("flex items-center", className)} {...props}/>));
exports.InputOTPGroup = InputOTPGroup;
InputOTPGroup.displayName = "InputOTPGroup";
const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(input_otp_1.OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];
    return (<div ref={ref} className={(0, utils_1.cn)("relative flex h-9 w-9 items-center justify-center border-y border-r border-zinc-200 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md dark:border-zinc-800", isActive && "z-10 ring-1 ring-zinc-950 dark:ring-zinc-300", className)} {...props}>
      {char}
      {hasFakeCaret && (<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-zinc-950 duration-1000 dark:bg-zinc-50"/>
        </div>)}
    </div>);
});
exports.InputOTPSlot = InputOTPSlot;
InputOTPSlot.displayName = "InputOTPSlot";
const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (<div ref={ref} role="separator" {...props}>
    <lucide_react_1.Minus />
  </div>));
exports.InputOTPSeparator = InputOTPSeparator;
InputOTPSeparator.displayName = "InputOTPSeparator";
