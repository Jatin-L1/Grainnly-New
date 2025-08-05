"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Building, 
  FileText, 
  Globe, 
  Home, 
  Info, 
  LayoutDashboard, 
  MessageSquare, 
  Package, 
  Settings, 
  Truck, 
  Users,
  MapPin, 
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function PublicLayout({ children }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/30">
        <Sidebar variant="inset" className="border-r border-green-100">
          <SidebarHeader className="border-b border-green-100">
            <Link href="/public">
              <div className="flex items-center gap-2 px-4 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="font-semibold text-green-900">Grainlyyy</div>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public"}>
                      <Link href="/public">
                        <LayoutDashboard className="h-4 w-4 text-green-700" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/deliveries"}>
                      <Link href="/public/deliveries">
                        <Truck className="h-4 w-4 text-green-700" />
                        <span>All Deliveries</span>
                        <Badge className="ml-auto bg-green-600">New</Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/dealers"}>
                      <Link href="/public/dealers">
                        <Building className="h-4 w-4 text-green-700" />
                        <span>Dealers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/complaints"}>
                      <Link href="/public/complaints">
                        <MessageSquare className="h-4 w-4 text-green-700" />
                        <span>Submit Complaint</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel>Information</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/locations"}>
                      <Link href="/public/locations">
                        <MapPin className="h-4 w-4 text-green-700" />
                        <span>Depot Locations</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/statistics"}>
                      <Link href="/public/statistics">
                        <BarChart3 className="h-4 w-4 text-green-700" />
                        <span>Statistics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/public/about"}>
                      <Link href="/public/about">
                        <Info className="h-4 w-4 text-green-700" />
                        <span>About Grainlyyy</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-green-100 p-4">
            <div className="text-xs text-center text-muted-foreground">
              <p>Public Transparency Portal</p>
              <p className="mt-1">© {new Date().getFullYear()} Grainlyyy</p>
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
                    placeholder="Search for depots, deliveries, or dealers..."
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
                <FileText className="h-4 w-4 mr-2" />
                <span className="sr-only sm:not-sr-only">Documents</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    <span className="sr-only sm:not-sr-only">Help</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/public/faq" className="flex w-full">FAQ</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/public/contact" className="flex w-full">Contact Us</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/public/help" className="flex w-full">Help Guide</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
          
          <footer className="border-t border-green-100 py-4 px-6 text-center text-sm text-muted-foreground">
            <p>Grainlyyy Public Transparency Portal — Making ration distribution accountable and transparent.</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}