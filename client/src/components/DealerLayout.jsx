"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Box,
  ClipboardList,
  Home,
  Leaf,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useMetaMask } from "@/components/MetaMaskProvider";

export default function DealerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, account } = useMetaMask();
  const [notifications, setNotifications] = React.useState(3);
  const [isMounted, setIsMounted] = React.useState(false);

  // Mark component as mounted on client side
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle authentication checks only on client-side after mounting
  React.useEffect(() => {
    if (isMounted) {
      const checkAuth = async () => {
        // Check if user data exists in localStorage first
        const currentUser = localStorage.getItem("currentUser");
        if (currentUser) {
          try {
            const userData = JSON.parse(currentUser);
            if (userData.type === "delivery") {
              return; // User is authenticated as delivery partner, stay on page
            }
          } catch (error) {
            console.log("Error parsing user data:", error);
          }
        }

        // If no stored delivery partner data, redirect to login
        if (!currentUser) {
          router.push("/login");
          return;
        }

        // If user data exists but not for delivery partner, redirect to login
        if (currentUser) {
          try {
            const userData = JSON.parse(currentUser);
            if (userData.type !== "delivery") {
              router.push("/login");
              return;
            }
          } catch (error) {
            router.push("/login");
            return;
          }
        }
      };

      // Add a small delay to allow for initialization
      const timeoutId = setTimeout(checkAuth, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [isMounted, router]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    router.push("/login");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-green-50/30">
        <Sidebar variant="inset" className="border-r border-green-100">
          <SidebarHeader className="border-b border-green-100">
            <Link href="/">
              <div className="flex items-center gap-2 px-4 py-1">
                <Image
                  src="/image2.png"
                  alt="Logo"
                  width={100}
                  height={100}
                  className="h-8 rounded-md w-[80%] mx-auto"
                />
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/dashboard"}
                    >
                      <Link href="/dashboard">
                        <Home className="h-4 w-4 text-green-700" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/inventory"}
                    >
                      <Link href="/inventory">
                        <Box className="h-4 w-4 text-green-700" />
                        <span>Inventory</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/deliveries"}
                    >
                      <Link href="/deliveries">
                        <Truck className="h-4 w-4 text-green-700" />
                        <span>Deliveries</span>
                        <Badge className="ml-auto bg-green-600 hover:bg-green-700">
                          {notifications}
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/supply-requests"}
                    >
                      <Link href="/supply-requests">
                        <ClipboardList className="h-4 w-4 text-green-700" />
                        <span>Supply Requests</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/distribution"}
                    >
                      <Link href="/distribution">
                        <ShoppingCart className="h-4 w-4 text-green-700" />
                        <span>Distribution</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Reports</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/analytics"}
                    >
                      <Link href="/analytics">
                        <BarChart3 className="h-4 w-4 text-green-700" />
                        <span>Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/customers"}
                    >
                      <Link href="/customers">
                        <Users className="h-4 w-4 text-green-700" />
                        <span>Customers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/settings"}
                    >
                      <Link href="/settings">
                        <Settings className="h-4 w-4 text-green-700" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-green-100">
            <div className="p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Dealer" />
                      <AvatarFallback className="bg-green-100 text-green-800">
                        GD
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">Grainlyy</span>
                      <span className="text-xs text-muted-foreground">
                        dealer@example.com
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-green-100 bg-white px-6">
            <SidebarTrigger />
            <div className="w-full md:w-auto md:flex-1">
              <form>
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search inventory, deliveries, customers..."
                    className="w-full rounded-md border-green-200 pl-8 md:w-[300px]"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-green-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700"
              >
                <span className="sr-only sm:not-sr-only sm:ml-2">Help</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative rounded-full border-green-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-green-700"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {notifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-medium text-white">
                        {notifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium">
                        New delivery request
                      </span>
                      <span className="text-xs text-muted-foreground">
                        10 minutes ago
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium">
                        Inventory alert: Low stock
                      </span>
                      <span className="text-xs text-muted-foreground">
                        30 minutes ago
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium">
                        Supply request approved
                      </span>
                      <span className="text-xs text-muted-foreground">
                        2 hours ago
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-center text-green-600">
                    Mark all as read
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt="Dealer" />
                      <AvatarFallback className="bg-green-100 text-green-800">
                        GD
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
