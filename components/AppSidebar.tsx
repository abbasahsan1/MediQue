import React from 'react';
import { queueService } from '@/services/queueService';
import {
  Activity,
  LayoutDashboard,
  Smartphone,
  Stethoscope,
  ClipboardList,
  LayoutGrid,
  Monitor,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { DepartmentConfig } from '@/types';

export type AppView =
  | 'LANDING'
  | 'DOCTOR_DASHBOARD'
  | 'ADMIN_DASHBOARD'
  | 'RECEPTION';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentView: AppView;
  availableDepartments: DepartmentConfig[];
  onNavigate: (path: string) => void;
}

const DEPT_DOT_COLORS: Record<string, string> = {
  GENERAL: 'bg-dept-general',
  ENT: 'bg-dept-ent',
  ORTHOPEDICS: 'bg-dept-orthopedics',
  DENTAL: 'bg-dept-dental',
  CARDIOLOGY: 'bg-dept-cardiology',
};

export function AppSidebar({
  currentView,
  availableDepartments,
  onNavigate,
  ...props
}: AppSidebarProps) {
  const isDoctorActive = currentView === 'DOCTOR_DASHBOARD';

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => onNavigate('/')}
              className="cursor-pointer select-none"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Activity className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground">MediQue</span>
                <span className="truncate text-xs text-sidebar-foreground/65">Queue Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Dashboard"
                isActive={currentView === 'LANDING'}
                onClick={() => onNavigate('/')}
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {/* Patient Check-In */}
            <Collapsible asChild className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Patient Check-In">
                    <Smartphone />
                    <span>Patient Check-In</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {availableDepartments.map((dept) => (
                      <SidebarMenuSubItem key={dept.id}>
                        <SidebarMenuSubButton
                          onClick={() => onNavigate(`/${dept.id.toLowerCase()}/newpatient`)}
                        >
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${DEPT_DOT_COLORS[dept.id] ?? 'bg-muted-foreground'}`} />
                          <span>{dept.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Doctor Portal */}
            <Collapsible asChild defaultOpen={isDoctorActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Doctor Portal" isActive={isDoctorActive}>
                    <Stethoscope />
                    <span>Doctor Portal</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {availableDepartments.map((dept) => (
                      <SidebarMenuSubItem key={dept.id}>
                        <SidebarMenuSubButton
                          onClick={() => onNavigate(`/doctor/${dept.id.toLowerCase()}`)}
                        >
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full flex-shrink-0 ${DEPT_DOT_COLORS[dept.id] ?? 'bg-muted-foreground'}`} />
                          <span>{dept.code} — {dept.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Reception Desk */}
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Reception Desk"
                isActive={currentView === 'RECEPTION'}
                onClick={() => onNavigate('/reception')}
              >
                <ClipboardList />
                <span>Reception Desk</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin Dashboard"
                isActive={currentView === 'ADMIN_DASHBOARD'}
                onClick={() => onNavigate('/admin')}
              >
                <LayoutGrid />
                <span>Admin Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Display</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="TV Queue Board"
                onClick={() => onNavigate('/tv')}
              >
                <Monitor />
                <span>TV Queue Board</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Reset system data"
              onClick={async () => {
                if (!window.confirm('Reset all system data? This cannot be undone.')) return;
                await queueService.clearData();
                window.location.reload();
              }}
              className="text-sidebar-foreground/65 hover:text-destructive"
            >
              <RotateCcw />
              <span>Reset System</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
