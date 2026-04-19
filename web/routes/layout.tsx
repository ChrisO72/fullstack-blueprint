import { Outlet, redirect, useLocation, useLoaderData } from "react-router";
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
import { getUserById } from "../../db/repositories/users";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireAuth(request);

  const user = await getUserById(auth.userId);
  if (!user) {
    throw redirect("/login");
  }

  // If we got new tokens from refresh, set both cookies
  if (auth.newAccessToken && auth.newRefreshToken) {
    const cookies = setAuthCookies(auth.newAccessToken, auth.newRefreshToken);
    const headers = new Headers();
    cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
    return Response.json({ user }, { headers });
  }

  return { user };
}

export default function Layout() {
  const location = useLocation();
  const { user } = useLoaderData<typeof loader>();
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
                {/* <Avatar
                  className="size-10"
                  initials={user.firstName ? user.firstName.slice(0, 1) : user.email.slice(0, 1)}
                /> */}
                <div>
                  <div>{user.firstName}</div>
                  <div className="text-xs opacity-60">{user.email}</div>
                </div>
              </div>
            </div>
            <SidebarItem href="/logout">
              <SidebarLabel>Sign out</SidebarLabel>
            </SidebarItem>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {/* {breadcrumbPages.length > 0 && <Breadcrumb pages={breadcrumbPages} />} */}
      <Outlet />
    </SidebarLayout>
  );
}
