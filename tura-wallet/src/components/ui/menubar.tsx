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
exports.MenubarShortcut = exports.MenubarSub = exports.MenubarGroup = exports.MenubarSubTrigger = exports.MenubarSubContent = exports.MenubarPortal = exports.MenubarRadioItem = exports.MenubarRadioGroup = exports.MenubarCheckboxItem = exports.MenubarLabel = exports.MenubarSeparator = exports.MenubarItem = exports.MenubarContent = exports.MenubarTrigger = exports.MenubarMenu = exports.Menubar = void 0;
const React = __importStar(require("react"));
const MenubarPrimitive = __importStar(require("@radix-ui/react-menubar"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const MenubarMenu = MenubarPrimitive.Menu;
exports.MenubarMenu = MenubarMenu;
const MenubarGroup = MenubarPrimitive.Group;
exports.MenubarGroup = MenubarGroup;
const MenubarPortal = MenubarPrimitive.Portal;
exports.MenubarPortal = MenubarPortal;
const MenubarSub = MenubarPrimitive.Sub;
exports.MenubarSub = MenubarSub;
const MenubarRadioGroup = MenubarPrimitive.RadioGroup;
exports.MenubarRadioGroup = MenubarRadioGroup;
const Menubar = React.forwardRef(({ className, ...props }, ref) => (<MenubarPrimitive.Root ref={ref} className={(0, utils_1.cn)("flex h-9 items-center space-x-1 rounded-md border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950", className)} {...props}/>));
exports.Menubar = Menubar;
Menubar.displayName = MenubarPrimitive.Root.displayName;
const MenubarTrigger = React.forwardRef(({ className, ...props }, ref) => (<MenubarPrimitive.Trigger ref={ref} className={(0, utils_1.cn)("flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900 dark:focus:bg-zinc-800 dark:focus:text-zinc-50 dark:data-[state=open]:bg-zinc-800 dark:data-[state=open]:text-zinc-50", className)} {...props}/>));
exports.MenubarTrigger = MenubarTrigger;
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;
const MenubarSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (<MenubarPrimitive.SubTrigger ref={ref} className={(0, utils_1.cn)("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900 dark:focus:bg-zinc-800 dark:focus:text-zinc-50 dark:data-[state=open]:bg-zinc-800 dark:data-[state=open]:text-zinc-50", inset && "pl-8", className)} {...props}>
    {children}
    <lucide_react_1.ChevronRight className="ml-auto h-4 w-4"/>
  </MenubarPrimitive.SubTrigger>));
exports.MenubarSubTrigger = MenubarSubTrigger;
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;
const MenubarSubContent = React.forwardRef(({ className, ...props }, ref) => (<MenubarPrimitive.SubContent ref={ref} className={(0, utils_1.cn)("z-50 min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50", className)} {...props}/>));
exports.MenubarSubContent = MenubarSubContent;
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;
const MenubarContent = React.forwardRef(({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => (<MenubarPrimitive.Portal>
      <MenubarPrimitive.Content ref={ref} align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={(0, utils_1.cn)("z-50 min-w-[12rem] overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50", className)} {...props}/>
    </MenubarPrimitive.Portal>));
exports.MenubarContent = MenubarContent;
MenubarContent.displayName = MenubarPrimitive.Content.displayName;
const MenubarItem = React.forwardRef(({ className, inset, ...props }, ref) => (<MenubarPrimitive.Item ref={ref} className={(0, utils_1.cn)("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50", inset && "pl-8", className)} {...props}/>));
exports.MenubarItem = MenubarItem;
MenubarItem.displayName = MenubarPrimitive.Item.displayName;
const MenubarCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (<MenubarPrimitive.CheckboxItem ref={ref} className={(0, utils_1.cn)("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50", className)} checked={checked} {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <lucide_react_1.Check className="h-4 w-4"/>
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>));
exports.MenubarCheckboxItem = MenubarCheckboxItem;
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;
const MenubarRadioItem = React.forwardRef(({ className, children, ...props }, ref) => (<MenubarPrimitive.RadioItem ref={ref} className={(0, utils_1.cn)("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-zinc-800 dark:focus:text-zinc-50", className)} {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <lucide_react_1.Circle className="h-4 w-4 fill-current"/>
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>));
exports.MenubarRadioItem = MenubarRadioItem;
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;
const MenubarLabel = React.forwardRef(({ className, inset, ...props }, ref) => (<MenubarPrimitive.Label ref={ref} className={(0, utils_1.cn)("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props}/>));
exports.MenubarLabel = MenubarLabel;
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;
const MenubarSeparator = React.forwardRef(({ className, ...props }, ref) => (<MenubarPrimitive.Separator ref={ref} className={(0, utils_1.cn)("-mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800", className)} {...props}/>));
exports.MenubarSeparator = MenubarSeparator;
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;
const MenubarShortcut = ({ className, ...props }) => {
    return (<span className={(0, utils_1.cn)("ml-auto text-xs tracking-widest text-zinc-500 dark:text-zinc-400", className)} {...props}/>);
};
exports.MenubarShortcut = MenubarShortcut;
MenubarShortcut.displayname = "MenubarShortcut";
