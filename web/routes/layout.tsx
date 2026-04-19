import { Form, Outlet, useLocation } from "react-router";
import { SidebarLayout } from "../components/ui-kit/sidebar-layout";
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarFooter,
} from "../components/ui-kit/sidebar";
import { Navbar } from "../components/ui-kit/navbar";
import { ThemeToggle } from "../components/theme-toggle";
import { requireAuth, setAuthCookies } from "../lib/session.server";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const { user, newAccessToken, newRefreshToken } = await requireAuth(request);

  if (newAccessToken && newRefreshToken) {
    const cookies = await setAuthCookies(newAccessToken, newRefreshToken);
    const headers = new Headers();
    cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    return Response.json({ user }, { headers });
  }

  return { user };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const { user } = loaderData;
  const pathname = location.pathname || "/";

  return (
    <SidebarLayout
      navbar={<Navbar>{/* Mobile navbar content */}</Navbar>}
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-1">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Cool App Name</h2>
            </div>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === "/"}>
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/do-things" current={pathname.startsWith("/do-things")}>
                <SidebarLabel>Do things</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/manage-items" current={pathname.startsWith("/manage-items")}>
                <SidebarLabel>Manage Items</SidebarLabel>
              </SidebarItem>
              {user.role === "admin" && (
                <SidebarItem href="/admin" current={pathname.startsWith("/admin")}>
                  <SidebarLabel>Admin</SidebarLabel>
                </SidebarItem>
              )}
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter>
            <ThemeToggle />
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-4">
                <div>
                  <div>{user.firstName}</div>
                  <div className="text-xs opacity-60">{user.email}</div>
                </div>
              </div>
            </div>
            <Form method="post" action="/logout">
              <SidebarItem type="submit">
                <SidebarLabel>Sign out</SidebarLabel>
              </SidebarItem>
            </Form>
          </SidebarFooter>
        </Sidebar>
      }
    >
      <Outlet />
    </SidebarLayout>
  );
}
