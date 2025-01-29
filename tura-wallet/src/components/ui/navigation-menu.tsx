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
exports.NavigationMenuViewport = exports.NavigationMenuIndicator = exports.NavigationMenuLink = exports.NavigationMenuTrigger = exports.NavigationMenuContent = exports.NavigationMenuItem = exports.NavigationMenuList = exports.NavigationMenu = exports.navigationMenuTriggerStyle = void 0;
const React = __importStar(require("react"));
const NavigationMenuPrimitive = __importStar(require("@radix-ui/react-navigation-menu"));
const class_variance_authority_1 = require("class-variance-authority");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const NavigationMenu = React.forwardRef(({ className, children, ...props }, ref) => (<NavigationMenuPrimitive.Root ref={ref} className={(0, utils_1.cn)("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props}>
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>));
exports.NavigationMenu = NavigationMenu;
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;
const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (<NavigationMenuPrimitive.List ref={ref} className={(0, utils_1.cn)("group flex flex-1 list-none items-center justify-center space-x-1", className)} {...props}/>));
exports.NavigationMenuList = NavigationMenuList;
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;
const NavigationMenuItem = NavigationMenuPrimitive.Item;
exports.NavigationMenuItem = NavigationMenuItem;
const navigationMenuTriggerStyle = (0, class_variance_authority_1.cva)("group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-zinc-100/50 data-[state=open]:bg-zinc-100/50 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50 dark:data-[active]:bg-zinc-800/50 dark:data-[state=open]:bg-zinc-800/50");
exports.navigationMenuTriggerStyle = navigationMenuTriggerStyle;
const NavigationMenuTrigger = React.forwardRef(({ className, children, ...props }, ref) => (<NavigationMenuPrimitive.Trigger ref={ref} className={(0, utils_1.cn)(navigationMenuTriggerStyle(), "group", className)} {...props}>
    {children}{""}
    <lucide_react_1.ChevronDown className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180" aria-hidden="true"/>
  </NavigationMenuPrimitive.Trigger>));
exports.NavigationMenuTrigger = NavigationMenuTrigger;
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;
const NavigationMenuContent = React.forwardRef(({ className, ...props }, ref) => (<NavigationMenuPrimitive.Content ref={ref} className={(0, utils_1.cn)("left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto", className)} {...props}/>));
exports.NavigationMenuContent = NavigationMenuContent;
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;
const NavigationMenuLink = NavigationMenuPrimitive.Link;
exports.NavigationMenuLink = NavigationMenuLink;
const NavigationMenuViewport = React.forwardRef(({ className, ...props }, ref) => (<div className={(0, utils_1.cn)("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport className={(0, utils_1.cn)("origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-950 shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50", className)} ref={ref} {...props}/>
  </div>));
exports.NavigationMenuViewport = NavigationMenuViewport;
NavigationMenuViewport.displayName =
    NavigationMenuPrimitive.Viewport.displayName;
const NavigationMenuIndicator = React.forwardRef(({ className, ...props }, ref) => (<NavigationMenuPrimitive.Indicator ref={ref} className={(0, utils_1.cn)("top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in", className)} {...props}>
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-zinc-200 shadow-md dark:bg-zinc-800"/>
  </NavigationMenuPrimitive.Indicator>));
exports.NavigationMenuIndicator = NavigationMenuIndicator;
NavigationMenuIndicator.displayName =
    NavigationMenuPrimitive.Indicator.displayName;
