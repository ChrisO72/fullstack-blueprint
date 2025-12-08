"use client";

import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router";

interface BreadcrumbPage {
  name: string;
  href: string;
  current: boolean;
}

interface BreadcrumbProps {
  pages: BreadcrumbPage[];
}

export function Breadcrumb({ pages }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex mb-6">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <Link
              to="/"
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <HomeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {pages.map((page) => (
          <li key={page.name}>
            <div className="flex items-center">
              <ChevronRightIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-gray-400 dark:text-gray-500"
              />
              <Link
                to={page.href}
                aria-current={page.current ? "page" : undefined}
                className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {page.name}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
