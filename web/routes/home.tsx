import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Cool App Name" },
    { name: "description", content: "Wow, this app is amazing" },
  ];
}

export default function Home() {
  return <div>Dashboard</div>;
}
