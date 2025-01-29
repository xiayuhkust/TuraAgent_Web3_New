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
exports.ToastAction = exports.ToastClose = exports.ToastDescription = exports.ToastTitle = exports.Toast = exports.ToastViewport = exports.ToastProvider = void 0;
const React = __importStar(require("react"));
const ToastPrimitives = __importStar(require("@radix-ui/react-toast"));
const class_variance_authority_1 = require("class-variance-authority");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const ToastProvider = ToastPrimitives.Provider;
exports.ToastProvider = ToastProvider;
const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Viewport ref={ref} className={(0, utils_1.cn)("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className)} {...props}/>));
exports.ToastViewport = ToastViewport;
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;
const toastVariants = (0, class_variance_authority_1.cva)("group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border border-zinc-200 p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full dark:border-zinc-800", {
    variants: {
        variant: {
            default: "border bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50",
            destructive: "destructive group border-red-500 bg-red-500 text-zinc-50 dark:border-red-900 dark:bg-red-900 dark:text-zinc-50",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
    return (<ToastPrimitives.Root ref={ref} className={(0, utils_1.cn)(toastVariants({ variant }), className)} {...props}/>);
});
exports.Toast = Toast;
Toast.displayName = ToastPrimitives.Root.displayName;
const ToastAction = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Action ref={ref} className={(0, utils_1.cn)("inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-zinc-100/40 group-[.destructive]:hover:border-red-500/30 group-[.destructive]:hover:bg-red-500 group-[.destructive]:hover:text-zinc-50 group-[.destructive]:focus:ring-red-500 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:focus:ring-zinc-300 dark:group-[.destructive]:border-zinc-800/40 dark:group-[.destructive]:hover:border-red-900/30 dark:group-[.destructive]:hover:bg-red-900 dark:group-[.destructive]:hover:text-zinc-50 dark:group-[.destructive]:focus:ring-red-900", className)} {...props}/>));
exports.ToastAction = ToastAction;
ToastAction.displayName = ToastPrimitives.Action.displayName;
const ToastClose = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Close ref={ref} className={(0, utils_1.cn)("absolute right-1 top-1 rounded-md p-1 text-zinc-950/50 opacity-0 transition-opacity hover:text-zinc-950 focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600 dark:text-zinc-50/50 dark:hover:text-zinc-50", className)} toast-close="" {...props}>
    <lucide_react_1.X className="h-4 w-4"/>
  </ToastPrimitives.Close>));
exports.ToastClose = ToastClose;
ToastClose.displayName = ToastPrimitives.Close.displayName;
const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Title ref={ref} className={(0, utils_1.cn)("text-sm font-semibold [&+div]:text-xs", className)} {...props}/>));
exports.ToastTitle = ToastTitle;
ToastTitle.displayName = ToastPrimitives.Title.displayName;
const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (<ToastPrimitives.Description ref={ref} className={(0, utils_1.cn)("text-sm opacity-90", className)} {...props}/>));
exports.ToastDescription = ToastDescription;
ToastDescription.displayName = ToastPrimitives.Description.displayName;
