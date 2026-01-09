import { Outlet, useLocation } from "react-router";
import { SidebarLayout } from "../components/ui-kit/sidebar-layout";
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "../components/ui-kit/sidebar";
import { Navbar } from "../components/ui-kit/navbar";
import { Breadcrumb } from "../components/ui-kit/breadcrumb";

function generateBreadcrumbs(
  pathname: string
): Array<{ name: string; href: string; current: boolean }> {
  const pages: Array<{ name: string; href: string; current: boolean }> = [];

  // Remove leading/trailing slashes and split
  const segments = pathname.split("/").filter(Boolean);

  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Map segment to display name
    let name = segment;
    if (segment === "insta-accounts") {
      name = "Insta Accounts";
    } else if (/^\d+$/.test(segment)) {
      // Show the account ID
      name = segment;
    } else {
      // Capitalize first letter
      name =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    }

    pages.push({
      name,
      href: currentPath,
      current: i === segments.length - 1,
    });
  }

  return pages;
}

export default function Layout() {
  const location = useLocation();
  const pathname = location.pathname || "/";
  const breadcrumbPages = pathname === "/" ? [] : generateBreadcrumbs(pathname);

  return (
    <SidebarLayout
      navbar={<Navbar>{/* Mobile navbar content */}</Navbar>}
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-1">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                Cool App Name
              </h2>
            </div>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === "/"}>
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/do-things"
                current={pathname.startsWith("/do-things")}
              >
                <SidebarLabel>Do things</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="/manage-items"
                current={pathname.startsWith("/manage-items")}
              >
                <SidebarLabel>Manage Items</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {breadcrumbPages.length > 0 && <Breadcrumb pages={breadcrumbPages} />}
      <Outlet />
    </SidebarLayout>
  );
}
